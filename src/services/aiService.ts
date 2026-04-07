import { GoogleGenAI } from "@google/genai";
import { Assignment, Course, User } from "../types";

/**
 * AI Service that can switch between real Gemini API and a Mock implementation.
 * This helps students save costs while still having a functional prototype.
 */
export class AIService {
  private ai: GoogleGenAI | null = null;
  private isMockMode: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      this.ai = new GoogleGenAI({ apiKey });
      this.isMockMode = false;
    } else {
      this.isMockMode = true;
      console.log("AI Service: No valid Gemini API Key found. Running in Mock Mode.");
    }
  }

  /**
   * Sends a message to the AI and returns the response.
   * Uses real Gemini API if configured, otherwise uses a smart mock.
   */
  async sendMessage(
    message: string, 
    context: { 
      user: User | null; 
      assignments: Record<string, Assignment>; 
      courses: Record<string, Course> 
    }
  ): Promise<string> {
    if (!this.isMockMode && this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: this.buildPrompt(message, context),
        });
        return response.text || "I'm sorry, I couldn't generate a response.";
      } catch (error) {
        console.error("Gemini API Error:", error);
        return this.getMockResponse(message, context) + "\n\n(Note: This was a mock response because the real API call failed.)";
      }
    }

    // Return mock response with a slight delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.getMockResponse(message, context);
  }

  /**
   * Builds a context-aware prompt for the real Gemini API.
   */
  private buildPrompt(message: string, context: { user: User | null; assignments: Record<string, Assignment>; courses: Record<string, Course> }): string {
    const openAssignments = Object.values(context.assignments).filter(a => a.status === 'open');
    const assignmentList = openAssignments.map(a => `- ${a.title} (Due: ${a.due})`).join('\n');
    const totalCredits = Object.values(context.courses).reduce((sum, c) => sum + (c.credits || 0), 0);
    
    return `
      You are StudyFlow AI, a helpful academic assistant for a student named ${context.user?.name || 'Student'}.
      
      Current Context:
      - Student ID: ${context.user?.id || 'Unknown'}
      - Department: ${context.user?.dept || 'Unknown'}
      - Total Credits Enrolled: ${totalCredits}
      - Pending Assignments (${openAssignments.length}):
      ${assignmentList}
      
      Strict Rules & Knowledge Base:
      1. Grading Calculation:
         - Total Score (100%) = Exams (60%) + Collected Points (40%)
         - Exam Breakdown: Mid-term (30%) and Final (30%)
         - Collected Points Breakdown: Assignments (15%), Participation (5%), and Quizzes (20%)
         - If the user provides partial scores, calculate what they need for a specific grade.
      
      2. Database Knowledge:
         - A Database is a structured system for storing data, designed for easy access, management, and updates.
         - Core pillars: Data Integrity, Scalability, Relationships (Primary/Foreign Keys).
      
      3. Study Techniques:
         - Recommend the Pomodoro Technique: 25m focus, 5m short break, 15-30m long break after 4 cycles.
      
      4. Constraints:
         - If asked for "Credits" (หน่วยกิต), return the specific count (${totalCredits}).
         - If asked for study techniques for "Database", combine Database principles with the Pomodoro technique.
      
      User Question: ${message}
      
      Please provide a helpful, encouraging, and concise response following these rules.
    `;
  }

  /**
   * Generates a smart mock response based on the user's query and context.
   */
  private getMockResponse(message: string, context: { user: User | null; assignments: Record<string, Assignment>; courses: Record<string, Course> }): string {
    const msg = message.toLowerCase();
    const openAssignments = Object.values(context.assignments).filter(a => a.status === 'open');
    const totalCredits = Object.values(context.courses).reduce((sum, c) => sum + (c.credits || 0), 0);

    // 1. Grading Calculation Logic
    if (msg.includes('grade') || msg.includes('score') || msg.includes('calculate') || msg.includes('criteria')) {
      const criteria = `
**Grading Criteria Breakdown:**
• **Exams (60%)**: Mid-term (30%) + Final (30%)
• **Collected Points (40%)**: 
  - Assignments: 15%
  - Participation: 5%
  - Quizzes: 20%

Total Score = 100%`;

      // Simple calculation logic if numbers are found
      const numbers = message.match(/\d+/g);
      if (numbers && (msg.includes('need') || msg.includes('want'))) {
        return `Based on our grading system (Exams 60%, Collected 40%), if you have ${numbers[0]}% already, you'll need to focus on your upcoming ${msg.includes('final') ? 'Final Exam' : 'assignments'} to reach your goal. ${criteria}`;
      }
      
      return `Sure! Here is how your grades are calculated:${criteria}`;
    }

    // 4. Strict Intent Matching: Credits
    if (msg.includes('credit') || msg.includes('หน่วยกิต')) {
      if (totalCredits > 0) {
        return `You are currently enrolled in **${totalCredits} credits** this semester across ${Object.keys(context.courses).length} courses.`;
      }
      return "Credit information not found.";
    }

    // 2 & 4. Database Knowledge Base + Context Awareness
    const isDatabaseQuery = msg.includes('database') || msg.includes('db');
    const isStudyQuery = msg.includes('study') || msg.includes('trip') || msg.includes('plan') || msg.includes('technique');

    if (isDatabaseQuery && isStudyQuery) {
      return `For studying **Database Principles**, I recommend combining core concepts with the **Pomodoro Technique**:
      
1. **Core Pillars**: Focus on Data Integrity, Scalability, and Relationships (Keys).
2. **Pomodoro Session**:
   - **Focus (25m)**: Deep dive into Primary/Foreign Key relationships.
   - **Short Break (5m)**: Quick stretch.
   - **Repeat**: Do this for 4 cycles, then take a **Long Break (15-30m)**.
   
This will help you consolidate the complex structures of a database effectively!`;
    }

    if (isDatabaseQuery) {
      return "A Database is a structured system for storing data, designed for easy access, management, and updates. The core pillars include:\n" +
             "* **Data Integrity**: Ensuring accuracy and reliability.\n" +
             "* **Scalability**: Supporting data growth and volume.\n" +
             "* **Relationships**: Connecting data via Keys (Primary/Foreign Keys) to reduce redundancy.";
    }

    // 3. Study Trip & Pomodoro Technique
    if (isStudyQuery) {
      return "For an effective study session (Study Trip), I recommend the **Pomodoro Technique**:\n" +
             "* **Focus**: 25 minutes of deep study.\n" +
             "* **Short Break**: 5 minutes.\n" +
             "* **Long Break**: After 4 cycles, take a 15–30 minute break to let the brain rest and consolidate information.";
    }

    // Default responses
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return `Hello ${context.user?.name?.split(' ')[0] || 'there'}! I'm your StudyFlow AI assistant. I can help with grading calculations, database principles, or study planning. What can I do for you?`;
    }

    const openCount = openAssignments.length;
    if (msg.includes('assignment') || msg.includes('homework')) {
      return `You have ${openCount} pending assignments. Would you like to plan a **Study Trip** using the Pomodoro technique to finish them?`;
    }

    return "I'm here to help! You can ask me about your **credits**, **grading criteria**, **database principles**, or request a **study plan**. What's on your mind?";
  }

  /**
   * Checks if the service is currently in mock mode.
   */
  get inMockMode(): boolean {
    return this.isMockMode;
  }
}

export const aiService = new AIService();
