// lib/mockApiHandler.js

export function handleMockApi(input) {
  const text = input.trim().toLowerCase();

  // --- RULE 4: หน่วยกิต (ต้อง check ก่อน เพื่อ override เทคนิคการเรียน) ---
  if (text.includes("หน่วยกิต") || text.includes("credits") || text.includes("credit")) {
    return "ไม่มีข้อมูลหน่วยกิตของวิชานี้ในระบบ";
  }

  // --- RULE 1: Grade / Score Calculation ---
  if (
    text.includes("เกรด") || text.includes("grade") ||
    text.includes("คะแนน") || text.includes("score") ||
    text.includes("คิดคะแนน") || text.includes("เกณฑ์")
  ) {
    const gradeInfo = `เกณฑ์การคิดคะแนน (100%):
    
📌 Exam (60%)
  - Mid-term: 30%
  - Final: 30%

📌 Collected Points (40%)
  - Assignments: 15%
  - Participation: 5%
  - Quizzes: 20%`;

    // ลองดึงตัวเลขจาก input เพื่อคำนวณ
    const numbers = input.match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length >= 1) {
      const scored = parseFloat(numbers[0]);
      const needed80 = Math.max(0, 80 - scored).toFixed(1);
      const needed70 = Math.max(0, 70 - scored).toFixed(1);
      return `${gradeInfo}\n\n📊 คะแนนที่มีอยู่: ${scored}\n- ต้องการอีก ${needed80} คะแนน เพื่อถึง 80%\n- ต้องการอีก ${needed70} คะแนน เพื่อถึง 70%`;
    }
    return gradeInfo;
  }

  // --- RULE 3: Study Trip / Pomodoro ---
  if (
    text.includes("study trip") || text.includes("ทริปการเรียน") ||
    text.includes("การจัดทริป") || text.includes("เทคนิคการเรียน")
  ) {
    // RULE 4: Context Awareness — ถ้าถามเทคนิคในวิชา Database ให้ผสม
    if (text.includes("database") || text.includes("ฐานข้อมูล")) {
      return `สำหรับการเรียนวิชา Database แนะนำให้ใช้เทคนิค Pomodoro ดังนี้:

⏱ Pomodoro สำหรับ Database:
  - 25 นาที: ศึกษา Concept เช่น Data Integrity, Relationships, Key
  - 5 นาที: ทบทวนสิ่งที่เรียน / วาด ER Diagram สั้นๆ
  - หลังครบ 4 รอบ: พัก 15-30 นาที

📖 สาระสำคัญที่ควรโฟกัส:
  - Data Integrity: ความถูกต้องของข้อมูล
  - Scalability: การรองรับการขยายตัว
  - Relationships: Primary/Foreign Key เพื่อลดความซ้ำซ้อน`;
    }

    return `สำหรับการเรียนที่มีประสิทธิภาพ (Study Trip/Session) ขอแนะนำเทคนิค Pomodoro:

⏱ วิธีใช้:
  - ตั้งเวลาเรียน/ทำงานอย่างจริงจัง 25 นาที
  - พักเบรกสั้นๆ 5 นาที
  - เมื่อทำครบ 4 รอบ ให้พักยาว 15-30 นาที
  
เพื่อให้สมองได้พักผ่อนและจดจำได้ดีขึ้น`;
  }

  // --- RULE 2: Database Knowledge ---
  if (text.includes("database") || text.includes("ฐานข้อมูล") || text.includes("สาระสำคัญ")) {
    return `Database คือระบบจัดเก็บข้อมูลที่มีโครงสร้าง เพื่อให้สามารถเข้าถึง จัดการ และอัปเดตได้ง่าย

📌 หัวใจสำคัญประกอบด้วย:
  - Data Integrity: ความถูกต้องและเชื่อถือได้ของข้อมูล
  - Scalability: การรองรับการขยายตัวของข้อมูล
  - Relationships: การเชื่อมโยงข้อมูลผ่าน Key (เช่น Primary/Foreign Key) เพื่อลดความซ้ำซ้อน`;
  }

  // --- Default fallback ---
  return "ขออภัย ไม่พบข้อมูลที่ตรงกับคำถามนี้ในระบบ กรุณาลองถามใหม่อีกครั้ง";
}
