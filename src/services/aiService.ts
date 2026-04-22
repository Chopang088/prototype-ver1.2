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
      1. Stay in scope. If asked about non-academic topics, decline politely.
      2. Use ONLY provided data.
      3. BE CONCISE. Under 100 words (except grade calculations). Use emojis.
      4. DO NOT USE ASTERISKS (*) for bolding or lists. Use clear line breaks and capitalization for emphasis.
      5. BE ENCOURAGING.
      6. SUGGEST NEXT ACTION as a plain text question at the end.

      DATA:
      - Credits: ${totalCredits}
      - Assignments:
      ${assignmentList}
      - Exams:
      ${courseList}

      User Question: ${message}
    `;
  }

  /**
   * Generates a smart mock response based on the user's query and context.
   */
  private getMockResponse(message: string, context: { user: User | null; assignments: Record<string, Assignment>; courses: Record<string, Course> }): string {
    const msg = message.toLowerCase();
    const TODAY = new Date(2026, 1, 19);
    const openAssignments = Object.values(context.assignments)
      .filter(a => {
        if (a.status !== 'open') return false;
        const diffTime = a.dueDate.getTime() - TODAY.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Dashboard only shows items due within the next 10 days
        return diffDays >= 0 && diffDays <= 10;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const courses = Object.values(context.courses);

    // OUT OF SCOPE CHECK
    const scopeKeywords = ['assignment', 'due', 'deadline', 'plan', 'submit', 'homework', 'how many', 'study', 'tip', 'grade', 'score', 'midterm', 'final', 'exam', 'review', 'calculate', 'credit', 'database', 'syllabus', 'english', 'algor', 'network', 'math', 'calculus', 'software', 'summarize'];
    const isSubjectMentionat = courses.some(c => msg.includes(c.code.toLowerCase()) || msg.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
    const isAcademic = scopeKeywords.some(k => msg.includes(k)) || isSubjectMentionat || msg.includes('hi') || msg.includes('hello');

    if (!isAcademic) {
      return "I can only help with your assignments and study planning. Try asking about your deadlines or exam schedule!\n\nWant me to help you plan your study schedule this week?";
    }

    // MODE 1: ASSIGNMENTS / DEADLINES
    if (msg.includes('deadline') || msg.includes('due') || msg.includes('next') || msg.includes('plan my week') || msg.includes('how many')) {
      const dashboardCount = openAssignments.length;
      
      if (msg.includes('how many')) {
        if (dashboardCount === 0) {
          return "Based on your dashboard (next 10 days), you have 0 pending assignments! 🎉\n\nWant to see your full course list to check for later tasks?";
        }
        return `Based on your dashboard, you have ${dashboardCount} assignment${dashboardCount > 1 ? 's' : ''} due within the next 10 days.\n\nNext up: ${openAssignments[0].title} (${openAssignments[0].due})\n\nWant me to help you plan your week for these tasks?`;
      }

      if (dashboardCount === 0) {
        return "You're all caught up! No pending assignments at the moment. 🎉\n\nWant to see your upcoming exam schedule instead?";
      }

      if (msg.includes('next')) {
        const next = openAssignments[0];
        return `Your next deadline is:\n\n📄 ${next.title.toUpperCase()}\nDATE: ${next.due}\n\n⚠️ Estimated time needed: 2 hours — start now!\n\nYou've got this! 💪\n\nWant to see all deadlines this week?`;
      }

      const plan = openAssignments.slice(0, 4).map((a, i) => `${i + 1}. 📄 ${a.title} (Due ${a.due})`).join('\n\n');
      return `Here's your priority plan for this week:\n\n${plan}\n\nStart with ${openAssignments[0].title} today!\n\nYou're doing great! 🚀\n\nWant study tips for any of these subjects?`;
    }

    // MODE 2: STUDY / EXAMS / GRADES
    if (msg.includes('grade') || msg.includes('calculate') || msg.includes('score')) {
      const numbers = message.match(/\d+/g);
      if (!numbers || numbers.length === 0) {
        return `Sure! Please tell me:\n\n- Your scores for each assignment\n- Your midterm score\n\nI'll calculate your estimated grade based on: Exams 60% + Collected 40%.\n\nReady to calculate your score?`;
      }
      return `Based on your current scores, you are on track! To maintain an A, you'll need at least 85% on your Final Exam. Keep up the consistent effort! 🌟\n\nWant me to show you the full grading breakdown?`;
    }

    const summaryDb: Record<string, string> = {
      'cs301': "NORMALIZATION\n\nDescription: Normalization organizes a relational database to reduce data redundancy and improve integrity by dividing large tables into smaller, related ones.\n\nFIRST NORMAL FORM (1NF):\nEach column contains atomic values, each column holds a single type, each row is unique, and there are no repeating groups.\n\nSECOND NORMAL FORM (2NF):\nMust be in 1NF and every non-key attribute must be fully functionally dependent on the entire primary key.\n\nTHIRD NORMAL FORM (3NF):\nMust be in 2NF and no transitive dependencies exist. Rule: Every non-key attribute must depend on the key, the whole key, and nothing but the key.",
      'eng101': "ENGLISH — PASSIVE VOICE\n\nDescription: Passive voice shifts the focus from the doer of the action to the receiver. Formed using verb 'to be' + past participle.\n\nSTRUCTURE:\nSubject + to be (conjugated) + past participle + (by + agent). The agent is optional and often omitted when unknown or unimportant.\n\nTENSE FORMS:\nPresent Simple: is/are + V3 | Past Simple: was/were + V3 | Future: will be + V3 | Present Perfect: has/have been + V3 | Past Perfect: had been + V3 | Present Continuous: is/are being + V3\n\nWHEN TO USE:\n(1) the doer is unknown (2) the doer is obvious (3) you want to emphasize the action over the subject.\n\nEXAMPLES:\nActive: \"The chef cooked the meal.\" → Passive: \"The meal was cooked by the chef.\"",
      'cs401': "SORTING ALGORITHMS\n\nDescription: Sorting algorithms arrange elements in a defined order. Understanding time/space complexity is essential.\n\nBUBBLE SORT: Repeatedly compares and swaps adjacent elements. Time: O(n²) | Space: O(1).\n\nMERGE SORT: Divide-and-conquer. Time: O(n log n) | Space: O(n).\n\nQUICK SORT: Picks a pivot and partitions the array. Time: O(n log n) average.\n\nHEAP SORT: Builds a max-heap then extracts the maximum. Time: O(n log n) | Space: O(1).",
      'net201': "OSI MODEL\n\nDescription: The OSI model standardizes network communication into 7 abstraction layers.\n\nLAYER 1-3: Physical (raw bits), Data Link (MAC, switches), Network (IP, routers).\n\nLAYER 4-5: Transport (TCP/UDP), Session (session management).\n\nLAYER 6-7: Presentation (encryption, translation), Application (HTTP, DNS).",
      'se201': "SDLC & AGILE\n\nDescription: SDLC defines phases of software creation. Agile is an iterative approach focused on flexibility and collaboration.\n\nSDLC PHASES: Planning, Requirements, Design, Implementation, Testing, Deployment, Maintenance.\n\nWATERFALL VS AGILE: Waterfall is linear/sequential. Agile uses iterative sprints and is adaptive to change.\n\nSCRUM FRAMEWORK: Roles (PO, Scrum Master, Team), Artifacts (Backlogs), Events (Sprints, Standups).",
      'math301': "BASIC CALCULUS\n\nDescription: Calculus studies continuous change via Differential (rates of change) and Integral (accumulation).\n\nLIMITS: Describes the value f(x) approaches. Use L'Hôpital's Rule for 0/0.\n\nDERIVATIVES:\nPower Rule: d/dx[xⁿ] = nxⁿ⁻¹\nProduct Rule: (uv)' = u'v + uv'\nChain Rule: d/dx[f(g(x))] = f'(g(x)) · g'(x)\n\nINTEGRALS:\nIndefinite: ∫f(x)dx = F(x) + C.\nDefinite: ∫[a to b] f(x)dx = F(b) − F(a)."
    };

    // ✅ SUMMARIZE block ต้องอยู่ก่อน study/tip block เสมอ
    if (msg.includes('summarize')) {
      const sub = courses.find(c => msg.includes(c.code.toLowerCase()) || msg.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
      if (!sub) return "Which subject do you want me to summarize?\n\nAvailable subjects: English, Database, Algorithms, Networks, Software Engineering, or Math 😊";
      const summary = summaryDb[sub.code.toLowerCase()];
      return summary ? `${summary}\n\nYou've got this! 💪\n\nWant me to show how many days you have left before the exam?` : "I don't have a summary for that subject yet. Try English, Database, Algorithms, or Math.";
    }

    // Handle subject-only response if it looks like a follow-up to a summary request
    const standaloneSub = courses.find(c => msg === c.code.toLowerCase() || msg === c.name.toLowerCase() || (msg.length > 3 && c.name.toLowerCase().includes(msg)));
    if (standaloneSub && summaryDb[standaloneSub.code.toLowerCase()]) {
      return `${summaryDb[standaloneSub.code.toLowerCase()]}\n\nYou've got this! 💪\n\nWant me to show how many days you have left before the exam?`;
    }

    // ✅ study/tip block อยู่หลัง summarize เสมอ
    if (msg.includes('tip') || msg.includes('study')) {
      const subject = courses.find(c => msg.includes(c.code.toLowerCase()) || msg.includes(c.name.toLowerCase()));
      return `Here are tips for your ${subject ? subject.name.toUpperCase() : 'studies'}:\n\n- Review lecture slides from Week 1–7\n\n- Use the POMODORO TECHNIQUE: 25 min study / 5 min break\n\n- Practice with past exam questions\n\n- Focus on high-priority topics in the syllabus\n\nYou've got this! 💪\n\nWant me to show how many days you have left before the exam?`;
    }

    if (msg.includes('exam') || msg.includes('midterm') || msg.includes('final')) {
      const nextExams = courses.map(c => `🗓 ${c.code} ${msg.includes('final') ? 'FINAL' : 'MIDTERM'}\nDATE: ${msg.includes('final') ? c.final : c.midterm}`).join('\n\n');
      return `Here is your exam schedule:\n\n${nextExams}\n\nPreparation is the key to success! 🎓\n\nWant me to help you plan a study schedule for these exams?`;
    }

    // DATABASE SPECIAL
    if (msg.includes('database')) {
      return `For DATABASE, remember these core pillars:\n\n1. DATA INTEGRITY: Ensuring accuracy.\n2. SCALABILITY: Supporting growth.\n3. RELATIONSHIPS: Primary and Foreign Keys.\n\nCombine this with Pomodoro for a perfect session! 🚀\n\nWant more specific tips for CS301?`;
    }

    // WELCOME / DEFAULT
    if (msg.includes('hi') || msg.includes('hello')) {
      return `Hello! I'm StudyFlow AI. I can help you with:\n\n📬 ASSIGNMENTS: Deadlines and planning\n\n📖 STUDY: Tips, exam schedules, and grade calculations\n\nHow can I help you succeed today? 😊\n\nWant me to check your next deadline?`;
    }

    return "I can help with your academic planning! You can ask about your deadlines, exam dates, or for study tips. 📚\n\nWould you like to see what's due soon?";
  }

  /**
   * Checks if the service is currently in mock mode.
   */
  get inMockMode(): boolean {
    return this.isMockMode;
  }
}

export const aiService = new AIService();