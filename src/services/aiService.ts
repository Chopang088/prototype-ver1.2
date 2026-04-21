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
    const assignmentList = openAssignments.map(a => `- ${a.title} (${a.course}, Due: ${a.due}, Points: ${a.points})`).join('\n');
    const courseList = Object.values(context.courses).map(c => `- ${c.name} (${c.code}): Midterm: ${c.midterm}, Final: ${c.final}`).join('\n');
    const totalCredits = Object.values(context.courses).reduce((sum, c) => sum + (c.credits || 0), 0);
    
    return `
      You are StudyFlow AI, a smart academic assistant for a student named ${context.user?.name || 'Student'}.
      
      SCOPE: ONLY answer questions in these two modes:
      📬 Mode 1: Assignment (Submission)
      - Assignments due soon / next deadline
      - Remaining assignments in specific subjects
      - Weekly planning based on deadlines
      
      📖 Mode 2: Study
      - Study tips for subjects/exams
      - Grade calculations based on user-provided scores (Formula: Total 100% = Exams 60% + Collected 40%)
      - Exam schedules and countdowns
      - Review summaries (based on course names)

      RULES:
      1. Stay in scope. If asked about non-academic topics (news, unrelated coding, general info), decline politely: "I can only help with your assignments and study planning. Try asking about your deadlines or exam schedule!"
      2. Use ONLY provided data:
         - Enrolled Credits: ${totalCredits}
         - Assignments:
         ${assignmentList}
         - Courses & Exams:
         ${courseList}
      3. BE CONCISE. Under 100 words (except grade calculations). Use bullet points and emojis.
      4. BE ENCOURAGING. End with a short motivational note (e.g., "You've got this! 💪").
      5. SUGGEST NEXT ACTION. Always end with ONE suggested follow-up in italics (e.g., *Want me to show how many days you have left before the exam?*).
      6. BOLD important info: subject names, dates, scores.

      User Question: ${message}
    `;
  }

  /**
   * Generates a smart mock response based on the user's query and context.
   */
  private getMockResponse(message: string, context: { user: User | null; assignments: Record<string, Assignment>; courses: Record<string, Course> }): string {
    const msg = message.toLowerCase();
    const openAssignments = Object.values(context.assignments)
      .filter(a => a.status === 'open')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const courses = Object.values(context.courses);
    const TODAY = new Date(2026, 1, 19);

    // OUT OF SCOPE CHECK
    const scopeKeywords = ['assignment', 'due', 'deadline', 'plan', 'submit', 'homework', 'study', 'tip', 'grade', 'score', 'midterm', 'final', 'exam', 'review', 'calculate', 'credit', 'database', 'syllabus'];
    const isAcademic = scopeKeywords.some(k => msg.includes(k)) || msg.includes('hi') || msg.includes('hello');

    if (!isAcademic) {
      return "I can only help with your assignments and study planning. Try asking about your deadlines or exam schedule!\n\n*Want me to help you plan your study schedule this week?*";
    }

    // MODE 1: ASSIGNMENTS / DEADLINES
    if (msg.includes('deadline') || msg.includes('due') || msg.includes('next') || msg.includes('plan my week')) {
      if (openAssignments.length === 0) {
        return "You're all caught up! No pending assignments at the moment. 🎉\n\n*Want to see your upcoming exam schedule instead?*";
      }

      if (msg.includes('next')) {
        const next = openAssignments[0];
        return `Your next deadline is:\n\n• 📄 **${next.title}** — **${next.due}**\n• ⚠️ Estimated time needed: **2 hours** — start now!\n\nYou've got this! 💪\n\n*Want to see all deadlines this week?*`;
      }

      const plan = openAssignments.slice(0, 4).map((a, i) => `${i + 1}. 📄 **${a.title}** — due **${a.due}**`).join('\n');
      return `Here’s your priority plan for this week:\n\n${plan}\n\nStart with **${openAssignments[0].title}** today!\n\nYou're doing great! 🚀\n\n*Want study tips for any of these subjects?*`;
    }

    // MODE 2: STUDY / EXAMS / GRADES
    if (msg.includes('grade') || msg.includes('calculate') || msg.includes('score')) {
      const numbers = message.match(/\d+/g);
      if (!numbers || numbers.length === 0) {
        return `Sure! Please tell me:\n• Your scores for each assignment (e.g., **85/100**)\n• Your midterm score (if available)\n\nI’ll calculate your estimated grade based on the weight: **Exams 60%** + **Collected 40%**.\n\n*Ready to calculate your score?*`;
      }
      return `Based on your current scores, you are on track! To maintain an **A**, you'll need at least **85%** on your **Final Exam**. Keep up the consistent effort! 🌟\n\n*Want me to show you the full grading breakdown?*`;
    }

    if (msg.includes('tip') || msg.includes('study') || msg.includes('studytrip')) {
      const subject = courses.find(c => msg.includes(c.code.toLowerCase()) || msg.includes(c.name.toLowerCase()));
      return `Here are tips for your **${subject ? subject.name : 'studies'}**:\n\n• 📚 Review lecture slides from **Week 1–7**\n• ⏱ Use the **Pomodoro technique**: **25 min** study / **5 min** break\n• 📝 Practice with past exam questions if available\n• 🧠 Focus on high-priority topics in the syllabus\n\nYou’ve got this! 💪\n\n*Want me to show how many days you have left before the exam?*`;
    }

    if (msg.includes('exam') || msg.includes('midterm') || msg.includes('final')) {
      const nextExams = courses.map(c => `• 🗓 **${c.code} ${msg.includes('final') ? 'Final' : 'Midterm'}** — **${msg.includes('final') ? c.final : c.midterm}**`).join('\n');
      return `Here is your exam schedule:\n\n${nextExams}\n\nPreparation is the key to success! 🎓\n\n*Want me to help you plan a study schedule for these exams?*`;
    }

    // DATABASE SPECIAL (Keeping internal rule)
    if (msg.includes('database')) {
      return `For **Database**, remember these core pillars:\n• **Data Integrity**: Ensuring accuracy.\n• **Scalability**: Supporting growth.\n• **Relationships**: Primary/Foreign Keys.\n\nCombine this with **Pomodoro** (25/5/30) for a perfect **Study Trip** session! 🚀\n\n*Want more specific tips for CS301?*`;
    }

    // WELCOME / DEFAULT
    if (msg.includes('hi') || msg.includes('hello')) {
      return `Hello! I'm **StudyFlow AI**. I can help you with:\n• 📬 **Assignments**: Deadlines and planning\n• 📖 **Study**: Tips, exam schedules, and grade calculations\n\nHow can I help you succeed today? 😊\n\n*Want me to check your next deadline?*`;
    }

    return "I can help with your academic planning! You can ask about your **deadlines**, **exam dates**, or for **study tips**. 📚\n\n*Would you like to see what's due soon?*";
  }

  /**
   * Checks if the service is currently in mock mode.
   */
  get inMockMode(): boolean {
    return this.isMockMode;
  }
}

export const aiService = new AIService();
