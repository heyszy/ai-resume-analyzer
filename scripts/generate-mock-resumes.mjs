import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "mock-data", "resumes");

const pageWidth = 595;
const pageHeight = 842;
const leftMargin = 48;
const topStart = 790;
const lineHeight = 18;
const fontSize = 11;

/**
 * 只生成 ASCII 文本内容，确保当前项目的 pdf-parse 能稳定提取文本。
 */
function sanitizeText(input) {
  return input
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPageStream(lines) {
  if (lines.length === 0) {
    return "";
  }

  const safeLines = lines.map(sanitizeText);
  const content = [
    "BT",
    `/F1 ${fontSize} Tf`,
    `${leftMargin} ${topStart} Td`,
    `${lineHeight} TL`,
    ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : ["T*", `(${line}) Tj`])),
    "ET",
  ];

  return `${content.join("\n")}\n`;
}

function buildPdfBuffer(pages) {
  const objects = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let nextObjectNumber = 4;

  for (const page of pages) {
    const pageObjectNumber = nextObjectNumber;
    const contentObjectNumber = nextObjectNumber + 1;
    const stream = buildPageStream(page.lines);

    pageObjectNumbers.push(pageObjectNumber);
    contentObjectNumbers.push(contentObjectNumber);

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] =
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream`;

    nextObjectNumber += 2;
  }

  objects[2] =
    `<< /Type /Pages /Count ${pageObjectNumbers.length} /Kids [` +
    pageObjectNumbers.map((number) => `${number} 0 R`).join(" ") +
    "] >>";

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "binary");
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "binary");
}

function writePdfFile(fileName, pages) {
  const fullPath = join(outputDir, fileName);
  writeFileSync(fullPath, buildPdfBuffer(pages));
  return fullPath;
}

function writeRawPdfLikeFile(fileName, content) {
  const fullPath = join(outputDir, fileName);
  writeFileSync(fullPath, content);
  return fullPath;
}

const mockResumes = [
  {
    fileName: "01-张磊-高级前端工程师.pdf",
    pages: [
      {
        lines: [
          "ZHANG LEI",
          "Senior Frontend Engineer",
          "Phone: 138-0013-8001",
          "Email: zhanglei.mock@example.com",
          "City: Shanghai",
          "",
          "SUMMARY",
          "8 years in web platform engineering and hiring workflow tools.",
          "Strong with React, Next.js, TypeScript, Tailwind CSS, Zustand and SWR.",
          "",
          "EXPERIENCE",
          "2022-Present  HiringOS  Senior Frontend Engineer",
          "- Led recruiter workspace rewrite for candidate review and JD comparison.",
          "- Built reusable table, drawer and PDF preview modules.",
          "- Improved first screen interaction and reduced repeated form operations.",
          "",
          "2020-2022  DataSuite  Frontend Engineer",
          "- Delivered dashboard and permission center for B2B products.",
        ],
      },
      {
        lines: [
          "PROJECTS",
          "Resume Workspace Revamp",
          "- Stack: Next.js, TypeScript, Tailwind CSS, SWR",
          "- Designed tri-pane workspace and candidate detail workflow.",
          "",
          "Open Hiring Analytics",
          "- Stack: React, Zustand, ECharts",
          "- Built scoring dashboard and pipeline conversion charts.",
          "",
          "EDUCATION",
          "Tongji University  Software Engineering  Bachelor  2020-06",
          "",
          "SKILLS",
          "React, Next.js, TypeScript, Tailwind CSS, SWR, Zustand, ECharts",
        ],
      },
    ],
  },
  {
    fileName: "02-林悦-全栈工程师.pdf",
    pages: [
      {
        lines: [
          "LIN YUE",
          "Full Stack Engineer",
          "Phone: 138-0013-8002",
          "Email: linyue.mock@example.com",
          "City: Hangzhou",
          "",
          "SUMMARY",
          "Focused on internal tools, workflow systems and AI assisted review flows.",
          "",
          "EXPERIENCE",
          "2021-Present  TalentFlow  Full Stack Engineer",
          "- Built resume upload API with Fastify and object storage integration.",
          "- Implemented structured extraction workflow and score persistence.",
          "- Maintained Next.js admin console with SWR data fetching.",
          "",
          "2019-2021  FormLab  Software Engineer",
          "- Shipped low-code configuration panels and audit logs.",
        ],
      },
      {
        lines: [
          "EDUCATION",
          "Zhejiang University  Computer Science  Master  2019-06",
          "",
          "SKILLS",
          "TypeScript, Node.js, Fastify, PostgreSQL, React, Next.js, Docker",
          "",
          "PROJECTS",
          "AI Resume Analyzer",
          "- Designed upload, extraction and ranking service boundaries.",
          "- Added stream based progress updates for long running analysis steps.",
        ],
      },
    ],
  },
  {
    fileName: "03-陈曦-数据分析师.pdf",
    pages: [
      {
        lines: [
          "CHEN XI",
          "Data Analyst",
          "Phone: 138-0013-8003",
          "Email: chenxi.mock@example.com",
          "City: Beijing",
          "",
          "SUMMARY",
          "Experienced in recruitment analytics, SQL modeling and dashboard design.",
          "",
          "EXPERIENCE",
          "2022-Present  InsightHR  Data Analyst",
          "- Built recruiter funnel reports and candidate source attribution models.",
          "- Partnered with product and ops teams to define hiring KPIs.",
          "",
          "EDUCATION",
          "Renmin University  Statistics  Bachelor  2021-06",
          "",
          "SKILLS",
          "SQL, Python, Tableau, ECharts, Experiment Design",
        ],
      },
    ],
  },
  {
    fileName: "04-吴辰-平台产品工程师.pdf",
    pages: [
      {
        lines: [
          "WU CHEN",
          "Platform Product Engineer",
          "Phone: 138-0013-8004",
          "Email: wuchen.mock@example.com",
          "City: Shenzhen",
          "",
          "SUMMARY",
          "Bridges product design and frontend implementation for internal systems.",
          "",
          "EXPERIENCE",
          "2020-Present  OpsCenter  Product Engineer",
          "- Owned dashboard information architecture and configuration workflows.",
          "- Worked closely with frontend team on state modeling and UX polish.",
          "",
          "EDUCATION",
          "South China University of Technology  Information Systems  Bachelor  2019-06",
          "",
          "SKILLS",
          "B2B Product Design, React, Metrics, Workflow Design",
        ],
      },
    ],
  },
  {
    fileName: "05-孙浩-移动端工程师.pdf",
    pages: [
      {
        lines: [
          "SUN HAO",
          "Mobile Engineer",
          "Phone: 138-0013-8005",
          "Email: sunhao.mock@example.com",
          "City: Chengdu",
          "",
          "SUMMARY",
          "6 years in React Native and Expo applications for enterprise workflows.",
          "",
          "EXPERIENCE",
          "2021-Present  MobileWorks  Senior Mobile Engineer",
          "- Built recruiter interview app with Expo Router and offline cache.",
          "- Integrated candidate list, detail panels and interview notes flow.",
        ],
      },
      {
        lines: [
          "EDUCATION",
          "University of Electronic Science and Technology of China",
          "Software Engineering  Bachelor  2020-06",
          "",
          "SKILLS",
          "React Native, Expo, TypeScript, Zustand, Native Modules",
          "",
          "PROJECTS",
          "Interview Companion",
          "- Added PDF preview entry and candidate state transition flow.",
        ],
      },
    ],
  },
  {
    fileName: "06-钱钰-应届生.pdf",
    pages: [
      {
        lines: [
          "QIAN YU",
          "Junior Frontend Engineer",
          "Phone: 138-0013-8006",
          "Email: qianyu.mock@example.com",
          "City: Nanjing",
          "",
          "SUMMARY",
          "New graduate with internship experience in React admin systems.",
          "",
          "INTERNSHIP",
          "2025-06 to 2025-12  CampusHire  Frontend Intern",
          "- Maintained candidate table filters and resume upload forms.",
          "- Wrote unit tests for data formatting and status badges.",
          "",
          "EDUCATION",
          "Nanjing University  Software Engineering  Bachelor  2026-06",
          "",
          "SKILLS",
          "React, TypeScript, CSS, Git",
        ],
      },
    ],
  },
  {
    fileName: "07-李娜-交互设计师.pdf",
    pages: [
      {
        lines: [
          "LI NA",
          "Interaction Designer",
          "Phone: 138-0013-8007",
          "Email: lina.mock@example.com",
          "City: Guangzhou",
          "",
          "SUMMARY",
          "Specialized in internal tool experience design and workflow clarity.",
          "",
          "EXPERIENCE",
          "2021-Present  DesignGrid  Product Designer",
          "- Designed recruiter dashboards, detail drawers and empty states.",
          "- Worked with engineers on component behavior and visual hierarchy.",
          "",
          "SKILLS",
          "Figma, Interaction Design, Design Systems, Usability Testing",
        ],
      },
    ],
  },
  {
    fileName: "08-损坏文件样本.pdf",
    rawContent: "%PDF-1.4\n% mock broken file for parser failure\n1 0 obj\n<< /Type /Catalog >>\n",
  },
];

mkdirSync(outputDir, { recursive: true });

const generatedFiles = mockResumes.map((resume) => {
  if ("rawContent" in resume) {
    return writeRawPdfLikeFile(resume.fileName, resume.rawContent);
  }

  return writePdfFile(resume.fileName, resume.pages);
});

console.log(`已生成 ${generatedFiles.length} 个 mock PDF：`);
for (const filePath of generatedFiles) {
  console.log(filePath);
}
