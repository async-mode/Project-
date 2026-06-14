import { PrismaClient, Role, TeacherStatus, CopyState } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@osm.local',
      name: 'Admin User',
      passwordHash: hashPassword('admin123'),
      role: Role.ADMIN,
    },
  });
  console.log('✓ Admin created:', admin.email);

  // Create 5 Teacher users
  const teachers = [];
  for (let i = 1; i <= 5; i++) {
    const teacher = await prisma.user.create({
      data: {
        email: `teacher${i}@osm.local`,
        name: `Teacher ${i}`,
        passwordHash: hashPassword(`teacher${i}123`),
        role: Role.TEACHER,
        schoolCode: `SCH${String(i).padStart(3, '0')}`,
        teacherStatus: i <= 2 ? TeacherStatus.BLOCKED : TeacherStatus.ACTIVE,
      },
    });
    teachers.push(teacher);
    console.log(`✓ Teacher created: ${teacher.email} (${teacher.teacherStatus})`);
  }

  // Create 10 Student users
  const students = [];
  for (let i = 1; i <= 10; i++) {
    const student = await prisma.user.create({
      data: {
        email: `student${i}@osm.local`,
        name: `Student ${i}`,
        passwordHash: hashPassword(`student${i}123`),
        role: Role.STUDENT,
      },
    });
    students.push(student);
    console.log(`✓ Student created: ${student.email}`);
  }

  // Create ExamConfig
  const examConfig = await prisma.examConfig.create({
    data: {
      examName: 'Chemistry Class 12 2026',
      subject: 'Chemistry',
      year: 2026,
      expectedPageCount: 10,
      totalMaxMarks: 70,
    },
  });
  console.log('✓ ExamConfig created:', examConfig.examName);

  // Create 5 Rubrics
  const rubrics = [];
  for (let i = 1; i <= 5; i++) {
    const rubric = await prisma.rubric.create({
      data: {
        examConfigId: examConfig.id,
        questionNumber: i,
        maxMarks: 14,
        answerKeyText: `Model answer for question ${i}. This is a comprehensive answer that covers all key concepts and demonstrates understanding of the topic.`,
      },
    });
    rubrics.push(rubric);
    console.log(`✓ Rubric created: Question ${i}`);
  }

  // Create 5 ExamCopy records in various states
  const copies = [];
  const states: CopyState[] = [
    CopyState.UPLOADED,
    CopyState.ASSIGNED,
    CopyState.GRADING_IN_PROGRESS,
    CopyState.AI_AUDITING,
    CopyState.FLAGGED_FOR_REVIEW,
  ];

  for (let i = 0; i < 5; i++) {
    const copy = await prisma.examCopy.create({
      data: {
        examConfigId: examConfig.id,
        studentRollNumber: `ROLL${String(i + 1).padStart(5, '0')}`,
        studentId: students[i].id,
        schoolCode: `SCH${String((i % 3) + 1).padStart(3, '0')}`,
        state: states[i],
        assignedTeacherId: states[i] !== CopyState.UPLOADED ? teachers[i % 3].id : null,
        assignedAt: states[i] !== CopyState.UPLOADED ? new Date() : null,
        pageCount: 10,
        sha256Hash: crypto.randomBytes(32).toString('hex'),
      },
    });
    copies.push(copy);
    console.log(`✓ ExamCopy created: ${copy.studentRollNumber} (${copy.state})`);
  }

  console.log('\n✓ Seeding completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@osm.local / admin123');
  console.log('  Teacher 1 (blocked): teacher1@osm.local / teacher1123');
  console.log('  Teacher 3 (active): teacher3@osm.local / teacher3123');
  console.log('  Student 1: student1@osm.local / student1123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
