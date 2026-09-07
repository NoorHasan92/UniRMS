import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "@/lib/auth-utils";
import {
  findContinuousAvailability,
  getAllResourcesDayStatus,
  getDashboardSummary
} from "@/lib/services/availability.service";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Extract the latest user message
    const lastUserMessage = messages[messages.length - 1]?.content;
    if (!lastUserMessage) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // Tools definition for Gemini
    const tools = [
      {
        name: "findContinuousAvailability",
        description: "Find a room with continuous free time. Useful when user asks 'find a room for 2 hours' or 'is there any lab available for 90 minutes'.",
        parameters: {
          type: "OBJECT",
          properties: {
            durationMinutes: {
              type: "INTEGER",
              description: "The required continuous duration in minutes. Example: 60, 90, 120"
            },
            resourceType: {
              type: "STRING",
              description: "The type of resource needed (e.g. 'CLASSROOM', 'LAB', 'SEMINAR_HALL', 'AUDITORIUM')",
              nullable: true
            },
            capacity: {
              type: "INTEGER",
              description: "Minimum required capacity",
              nullable: true
            },
            date: {
              type: "STRING",
              description: "Date in YYYY-MM-DD format if requested, otherwise leave null for today",
              nullable: true
            }
          },
          required: ["durationMinutes"]
        }
      },
      {
        name: "getAllResourcesDayStatus",
        description: "Get the status of all resources for a specific day. Useful for checking overall utilization, finding fully unused rooms, or filtering resources by facilities (like projector, smart board, computers) since the returned objects include hasProjector, hasSmartBoard, and computerCount.",
        parameters: {
          type: "OBJECT",
          properties: {
            date: {
              type: "STRING",
              description: "Date in YYYY-MM-DD format if requested",
              nullable: true
            },
            status: {
              type: "STRING",
              description: "Filter by status: 'FULLY_UNUSED', 'PARTIALLY_USED', 'FULLY_OCCUPIED'",
              nullable: true
            }
          }
        }
      },
      {
        name: "getDashboardSummary",
        description: "Get the high-level dashboard summary showing total resources, utilization percentage, and block/department breakdown.",
        parameters: {
          type: "OBJECT",
          properties: {
            date: {
              type: "STRING",
              description: "Date in YYYY-MM-DD format if requested",
              nullable: true
            }
          }
        }
      }
    ];

    // Determine current date for the AI context
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: `You are the AI assistant for UniRMS (University Resource Management System). Today's date is ${formattedDate}. When users ask for today's schedule, tomorrow's schedule, or any dates, calculate the correct date relative to ${formattedDate}. When users ask about facilities like projectors, smart boards, or computers, use the getAllResourcesDayStatus tool and check the hasProjector, hasSmartBoard, and computerCount fields in the returned results to answer their query accurately.`,
      tools: [{ functionDeclarations: tools as any }]
    });

    let formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    // Gemini API requires the first message in history to be from the 'user'
    while (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(lastUserMessage);
    const response = result.response;
    
    // Check if Gemini wants to call a function
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolData = null;

      try {
        if (call.name === "findContinuousAvailability") {
          const args = call.args as any;
          toolData = await findContinuousAvailability({
            durationMinutes: args.durationMinutes,
            resourceType: args.resourceType,
            capacity: args.capacity,
            date: args.date,
          });
        } else if (call.name === "getAllResourcesDayStatus") {
          const args = call.args as any;
          toolData = await getAllResourcesDayStatus({
            date: args.date,
            status: args.status as any,
          });
        } else if (call.name === "getDashboardSummary") {
          const args = call.args as any;
          toolData = await getDashboardSummary(args.date);
        }

        // Send tool response back to Gemini as a regular user message text
        // since the newer models removed the explicit 'function' role
        const toolResult = await chat.sendMessage(`The function ${call.name} returned this data: ${JSON.stringify(toolData)}`);

        return NextResponse.json({
          role: "model",
          content: toolResult.response.text(),
        });
      } catch (err: any) {
        // Handle tool error
        const toolResult = await chat.sendMessage(`The function ${call.name} encountered an error: ${err.message}`);

        return NextResponse.json({
          role: "model",
          content: toolResult.response.text(),
        });
      }
    }

    // No function call, just return text
    return NextResponse.json({
      role: "model",
      content: response.text(),
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
