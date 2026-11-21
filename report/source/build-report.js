// Builds the RupeeRound project report (A4, Times New Roman 12, 1.5 spacing).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat, Footer,
  PageNumber, NumberFormat, TableOfContents, VerticalAlign,
} = require('docx');

// Images (arch.png, flow.png, screens.png) are read from this folder.
const SCRATCH = __dirname;
const OUT = process.argv[2];
const FONT = 'Times New Roman';
const TEXT_W = 8300; // DXA usable width: A4 11906 − left 2160 − right 1440 ≈ 8306

/* ---------- helpers ---------- */
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: 24, ...o });
const P = (children, o = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 120 },
  children: (Array.isArray(children) ? children : [children]).map((c) => (typeof c === 'string' ? run(c) : c)), ...o,
});
/** Paragraph with **bold** segments. */
const PB = (text, o = {}) => P(text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith('**') ? run(s.slice(2, -2), { bold: true }) : run(s))), o);
const C = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360, after: 120 }, children: [run(text, o)] });
const gap = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [run('')] }));
const H1 = (text, breakBefore = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: breakBefore, children: [new TextRun({ text, font: FONT })] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })] });
const FrontTitle = (text, breakBefore = true) => new Paragraph({
  alignment: AlignmentType.CENTER, pageBreakBefore: breakBefore, spacing: { after: 360 },
  children: [run(text, { bold: true, size: 32 })],
});
const bullets = (items) => items.map((t) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 60 },
  children: t.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith('**') ? run(s.slice(2, -2), { bold: true }) : run(s))),
}));
const numbered = (items, ref = 'numbers') => items.map((t) => new Paragraph({
  numbering: { reference: ref, level: 0 }, alignment: ref === 'refs' ? AlignmentType.LEFT : AlignmentType.JUSTIFIED, spacing: { line: 360, after: 60 }, children: [run(t)],
}));
const code = (lines) => lines.map((l, i) => new Paragraph({
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' },
  spacing: { line: 240, before: i === 0 ? 120 : 0, after: i === lines.length - 1 ? 200 : 0 },
  indent: { left: 200, right: 200 },
  children: [new TextRun({ text: l || ' ', font: 'Courier New', size: 19 })],
}));
const caption = (text) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240 }, children: [run(text, { italics: true, size: 21 })] });
const img = (file, w, h) => new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: w, height: h } });
const figure = (file, w, h, cap) => [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, keepNext: true, children: [img(file, w, h)] }), caption(cap)];

const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const borders = { top: border, bottom: border, left: border, right: border };
function table(widths, rows, { header = true, size = 21 } = {}) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, r) => new TableRow({
      tableHeader: header && r === 0,
      cantSplit: true,
      children: cells.map((text, c) => new TableCell({
        width: { size: widths[c], type: WidthType.DXA }, borders,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        shading: header && r === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E7E6E6' } : undefined,
        children: [new Paragraph({ spacing: { line: 260 }, children: [run(text, { size, bold: header && r === 0 })] })],
      })),
    })),
  });
}
const tableCaption = (text) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 200, after: 80 }, children: [run(text, { bold: true, size: 21 })] });
const pageNumFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] });
const sectionProps = (pageNumbers) => ({
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1440, bottom: 1440, left: 2160, right: 1440, footer: 600 },
    ...(pageNumbers ? { pageNumbers } : {}),
  },
});
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
function phoneRow(files, captions, w, h) {
  const colW = Math.floor(TEXT_W / files.length);
  return new Table({
    width: { size: colW * files.length, type: WidthType.DXA }, columnWidths: files.map(() => colW),
    rows: [new TableRow({
      cantSplit: true,
      children: files.map((f, i) => new TableCell({
        width: { size: colW, type: WidthType.DXA }, borders: noBorders,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [img(f, w, h)] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [run(captions[i], { size: 20 })] }),
        ],
      })),
    })],
  });
}
const sig = (left, right) => new Table({
  width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W / 2, TEXT_W / 2],
  rows: [new TableRow({ children: [left, right].map((lines, i) => new TableCell({
    width: { size: TEXT_W / 2, type: WidthType.DXA }, borders: noBorders,
    children: lines.map((l, j) => new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT, spacing: { line: 300 }, children: [run(l, { bold: j === 1 })] })),
  })) })],
});

/* ---------- content ---------- */
const TITLE = 'RupeeRound: A UPI Round-Up Micro-Investing Application';

const cover = [
  ...gap(1),
  C('INSTITUTE OF ENGINEERING AND MANAGEMENT', { bold: true, size: 34 }),
  C('Department of Computer Science and Engineering', { size: 26 }),
  ...gap(2),
  C('A Project Report on', { italics: true, size: 26 }),
  C('RUPEEROUND', { bold: true, size: 48 }),
  C('A UPI Round-Up Micro-Investing Application', { bold: true, size: 30 }),
  ...gap(1),
  C('Submitted in partial fulfilment of the requirements for the degree of', { size: 24 }),
  C('Bachelor of Technology in Computer Science and Engineering', { bold: true, size: 24 }),
  ...gap(2),
  C('Submitted by', { italics: true, size: 24 }),
  C('Aditya Narayan', { bold: true, size: 28 }),
  C('Enrollment No.: 12024052002234', { size: 24 }),
  C('B.Tech (CSE), 5th Semester', { size: 24 }),
  ...gap(1),
  C('Under the guidance of', { italics: true, size: 24 }),
  C('Prof. Bavrabi Ghosh', { bold: true, size: 28 }),
  C('Department of Computer Science and Engineering', { size: 24 }),
  ...gap(2),
  C('Academic Year 2026–27', { bold: true, size: 24 }),
];

const certificate = [
  FrontTitle('CERTIFICATE', false),
  P(`This is to certify that the project report entitled “${TITLE}”, submitted by Aditya Narayan (Enrollment No. 12024052002234), a student of B.Tech in Computer Science and Engineering, 5th Semester, Institute of Engineering and Management, is a bonafide record of the project work carried out under my supervision and guidance during the academic year 2026–27.`),
  P('To the best of my knowledge, the work presented in this report is original and has not been submitted elsewhere for the award of any degree or diploma.'),
  ...gap(4),
  sig(['________________________', 'Prof. Bavrabi Ghosh', 'Project Guide', 'Department of CSE'], ['________________________', 'Head of the Department', 'Department of CSE', 'Institute of Engineering and Management']),
  ...gap(2),
  P('Date: ____________________'),
  P('Place: ___________________'),
];

const declaration = [
  FrontTitle('DECLARATION'),
  P(`I, Aditya Narayan (Enrollment No. 12024052002234), a student of B.Tech in Computer Science and Engineering, 5th Semester, Institute of Engineering and Management, hereby declare that the project report entitled “${TITLE}” is a record of my own work carried out under the guidance of Prof. Bavrabi Ghosh, Department of Computer Science and Engineering.`),
  P('I further declare that this work has not been submitted, in part or in full, to any other university or institution for the award of any degree or diploma. All external sources, libraries and data used in this project have been duly acknowledged.'),
  ...gap(4),
  sig(['Date: ____________________', '', 'Place: ___________________'], ['________________________', 'Aditya Narayan', 'Enrollment No. 12024052002234']),
];

const acknowledgement = [
  FrontTitle('ACKNOWLEDGEMENT'),
  P('I would like to express my sincere gratitude to my project guide, Prof. Bavrabi Ghosh, Department of Computer Science and Engineering, for the valuable guidance, encouragement and constructive feedback given throughout this project.'),
  P('I am thankful to the Head of the Department and all the faculty members of the Department of Computer Science and Engineering, Institute of Engineering and Management, for providing the academic environment and resources that made this work possible.'),
  P('The idea behind RupeeRound was first prototyped at a college hackathon. I am grateful for that opportunity, which encouraged me to develop the idea further into the complete application described in this report.'),
  P('I also acknowledge the open-source community behind the tools used in this project, and the maintainers of mfapi.in for providing free access to Indian mutual fund NAV data.'),
  P('Finally, I thank my family and friends for their constant support and motivation.'),
  ...gap(3),
  new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Aditya Narayan', { bold: true })] }),
  new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('B.Tech (CSE), 5th Semester')] }),
];

const abstract = [
  FrontTitle('ABSTRACT'),
  P('Unified Payments Interface (UPI) has made small digital payments a part of everyday life in India, yet many people still postpone investing because they feel they do not have “enough” money to start. This project presents RupeeRound, a mobile-first web application that connects these two behaviours: every UPI payment is rounded up to a step chosen by the user (for example, ₹32 becomes ₹35 with a ₹5 step), and the difference is saved in a round-up wallet. Once the wallet covers a fund’s minimum, it is invested in a Large Cap, Mid Cap or Small Cap index fund; below the minimum, the balance carries forward to the next payments.'),
  P('The system is built as a TypeScript monorepo with a React 19 progressive web app, an Express 5 REST API and MongoDB Atlas, sharing one package of money logic between client and server so that both always agree. All amounts are stored as integer paise and every wallet change runs inside a database transaction. Fund prices are real Net Asset Values (NAVs) fetched from mfapi.in. A rule-based advisor maps a three-question risk profile to a fund category, while a large language model (via Groq) only words the explanation and answers mutual-fund questions under strict guardrails. A “What if?” backtest replays a year of simulated spending against real past NAVs; for a daily-commuter profile with a ₹10 step, ₹7,333 of round-ups would have grown to ₹7,748 in a Nifty 50 index fund over a year in which the fund itself fell 1.8%.'),
  P('Payments and investments in this prototype are simulated; no real money moves. The report describes the requirements, design, implementation, testing and future scope of the system.'),
  new Paragraph({ spacing: { before: 200 }, children: [run('Keywords: ', { bold: true }), run('UPI, micro-investing, round-up savings, index funds, mutual funds, React, Express, MongoDB, large language models, backtesting.')] }),
];

const contents = [
  FrontTitle('CONTENTS'),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
];

/* ---------- chapters ---------- */
const ch1 = [
  H1('Chapter 1: Introduction', false),
  H2('1.1 Background'),
  P('UPI has become the most common way to pay for small everyday purchases in India: tea, auto rides, groceries and medicines are now routinely paid by scanning a QR code. At the same time, mutual funds, and index funds in particular, have become an accessible way for individuals to take part in the growth of the stock market. Yet for many students, young earners and first-time investors, investing still feels like something for “later”, when there is a larger sum available, a budget in place and enough knowledge to choose a fund.'),
  P('Round-up investing addresses exactly this gap. Instead of asking people to set aside a lump sum, it collects the small difference between each payment and the next round figure and invests that spare change automatically. RupeeRound applies this idea to UPI payments and Indian index funds.'),
  H2('1.2 Problem Statement'),
  P('People make many small UPI payments every week but rarely start investing, mainly because of three barriers: the belief that a large amount is needed to begin, the difficulty of budgeting and remembering to invest regularly, and the perceived complexity and risk of choosing investments. The problem addressed by this project is to design and build an application that turns everyday UPI payments into a steady, automatic investment habit, while explaining investment choices in plain language and never giving misleading advice.'),
  H2('1.3 Objectives'),
  ...numbered([
    'To round up every simulated UPI payment to a user-chosen step (₹5, ₹10, ₹20, ₹50 or ₹100) and save the difference in a round-up wallet.',
    'To invest the wallet in a Large, Mid or Small Cap index fund once it covers the fund’s minimum, and carry the balance forward otherwise, with an optional top-up.',
    'To use real fund prices (NAVs) and compute returns, volatility and drawdown from real NAV history.',
    'To suggest a suitable fund category using transparent, unit-tested rules, with an AI that only explains and never decides.',
    'To let users ask any mutual-fund question to an AI assistant that answers in plain words and refuses off-topic or prediction requests.',
    'To show, through a backtest on real past prices, how round-ups would have grown for different spending patterns.',
    'To keep money handling exact and safe through integer paise, database transactions, PIN confirmation and secure authentication.',
  ], 'objectives'),
  H2('1.4 Scope and Limitations'),
  P('RupeeRound is a working prototype intended for demonstration and learning. Payments, wallet top-ups and investments are simulated, and fund minimums are demo values that are clearly labelled in the application. Fund prices, however, are real and are fetched live from a public data source. Handling real money would require regulatory approvals, a payment partner and investor verification (KYC), which are discussed under future scope.'),
  H2('1.5 Organisation of the Report'),
  P('Chapter 2 reviews existing approaches and identifies the gap. Chapter 3 lists the requirements and technology stack. Chapter 4 describes the system design, Chapter 5 the implementation and Chapter 6 the testing and results. Chapter 7 concludes the report and outlines future work.'),
];

const ch2 = [
  H1('Chapter 2: Literature Survey and Existing Systems'),
  H2('2.1 Round-Up Investing'),
  P('Round-up investing was popularised internationally by applications such as Acorns, which link a user’s cards, round each purchase up to the next whole unit of currency and invest the accumulated spare change in a portfolio of index funds. The approach relies on two behavioural insights: small amounts feel painless to give up, and an automatic process removes the need for discipline or reminders.'),
  H2('2.2 Investing and Saving Applications in India'),
  P('In India, two broad kinds of applications serve the space. Mutual fund investing platforms let users invest directly in thousands of schemes through one-time investments or Systematic Investment Plans (SIPs); they are powerful but assume that the user already has an amount to invest and knows which fund to choose. Micro-saving applications, on the other hand, encourage small daily or round-up savings, often into instruments such as digital gold. RupeeRound combines the low entry barrier of micro-saving with simple, diversified index funds and adds education through rules, explanations and backtesting.'),
  H2('2.3 Index Funds and Fund Categories'),
  P('An index fund passively tracks a market index such as the Nifty 50, which keeps costs low and removes the need to pick individual stocks. The Securities and Exchange Board of India (SEBI) defines fund categories by company size based on full market capitalisation: Large Cap covers the 1st to 100th companies, Mid Cap the 101st to 250th, and Small Cap the 251st company onwards. Smaller companies usually show larger price swings, so the three categories offer a natural ladder of risk for beginners. RupeeRound offers one real index fund in each category.'),
  H2('2.4 Rupee-Cost Averaging'),
  P('Investing small amounts at regular intervals means buying more units when prices are low and fewer when prices are high. This rupee-cost averaging reduces the impact of timing and is one reason why regular investing can do better than the market’s own point-to-point return in a volatile year. Round-up investing naturally produces this pattern, and the project’s backtest (Section 5.6) demonstrates it with real data.'),
  H2('2.5 Gap Analysis'),
  tableCaption('Table 2.1: Comparison of approaches'),
  table([2900, 1800, 1800, 1800], [
    ['Feature', 'Typical MF investing app', 'Typical micro-saving app', 'RupeeRound'],
    ['Start without a lump sum', 'No', 'Yes', 'Yes'],
    ['Automatic saving from UPI payments', 'No', 'Partly', 'Yes'],
    ['Diversified index funds', 'Yes', 'Often not', 'Yes'],
    ['Rule-based fund suggestion', 'Varies', 'No', 'Yes'],
    ['AI answers investing questions', 'Rare', 'Rare', 'Yes, with guardrails'],
    ['Backtest on real past prices', 'Rare', 'No', 'Yes'],
  ]),
];

const ch3 = [
  H1('Chapter 3: Requirements Analysis'),
  H2('3.1 Functional Requirements'),
  ...numbered([
    'Sign-up with phone number and one-time password (OTP), and login with a 4-digit PIN.',
    'Simulated UPI payment by scanning a real UPI QR code, uploading a QR photo or entering a shop and amount.',
    'Round-up of each payment to the chosen step and credit of the difference to the wallet.',
    'Wallet view with progress towards the selected fund’s minimum, and an optional top-up.',
    'Investment of the wallet in a chosen fund at the latest NAV when the minimum is met; carry-forward otherwise.',
    'Portfolio with units held, invested amount, current value and gain or loss.',
    'Fund comparison with live NAV and 1-month, 3-month, 1-year and 3-year returns.',
    'Rule-based fund suggestion from a three-question risk profile.',
    'AI assistant for mutual-fund questions, able to look up any Indian mutual fund.',
    '“What if?” backtest of spending profiles against real past NAVs.',
  ], 'fr'),
  H2('3.2 Non-Functional Requirements'),
  ...bullets([
    '**Correctness:** all money stored and computed as integer paise; no floating-point rupees.',
    '**Consistency:** each wallet change and the record it creates are written in one database transaction.',
    '**Security:** hashed PINs, signed session tokens, PIN on every payment, lockout after repeated wrong PINs, input validation and rate limiting.',
    '**Privacy:** the AI receives only computed facts, never the user’s name, phone number or wallet balance.',
    '**Reliability:** fund prices are cached, requests time out, and the last good NAV is used if the data source is unavailable.',
    '**Usability:** mobile-first interface sized for a 6.5-inch phone, with dark and light themes, installable as a PWA.',
  ]),
  H2('3.3 Hardware and Software Requirements'),
  tableCaption('Table 3.1: Hardware and software requirements'),
  table([2600, 5700], [
    ['Item', 'Requirement'],
    ['Development machine', 'Any modern laptop with 8 GB RAM, Windows, macOS or Linux'],
    ['Client device', 'Any smartphone or desktop browser (camera optional for QR scanning)'],
    ['Runtime', 'Node.js 22 or later, pnpm 10'],
    ['Database', 'MongoDB Atlas (replica set required for transactions)'],
    ['External services', 'mfapi.in (fund NAVs), Groq API (language model)'],
    ['Hosting', 'Vercel (client), Render (API), MongoDB Atlas (database)'],
  ]),
  H2('3.4 Technology Stack'),
  tableCaption('Table 3.2: Technology stack'),
  table([2000, 6300], [
    ['Layer', 'Technologies'],
    ['Frontend', 'React 19, React Router v7, Vite 8, Tailwind CSS v4, Recharts v3, lucide-react, jsQR, PWA (manifest and service worker)'],
    ['Backend', 'Node.js, Express 5, Mongoose 9, zod 4, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit'],
    ['Database', 'MongoDB Atlas with multi-document transactions'],
    ['AI', 'Groq API with the openai/gpt-oss-20b model and tool calling'],
    ['Data', 'mfapi.in for Indian mutual fund NAV history'],
    ['Tooling', 'TypeScript (strict) across all packages, pnpm workspaces, Node’s built-in test runner'],
  ]),
];

const ch4 = [
  H1('Chapter 4: System Design'),
  H2('4.1 System Architecture'),
  P('RupeeRound follows a three-tier architecture organised as a pnpm monorepo with three packages: the client, the server and a shared package. The shared package contains the round-up, carry-forward, fund-metric and backtest logic together with the API types, so the preview a user sees in the app always matches what the server records. Figure 4.1 shows the components and how they communicate.'),
  ...figure(path.join(SCRATCH, 'arch.png'), 550, 254, 'Figure 4.1: System architecture'),
  H2('4.2 Round-Up and Investment Flow'),
  P('Figure 4.2 shows the core flow. A payment is rounded up and the difference is credited to the wallet in the same transaction that records the payment. When the wallet reaches the fund minimum it is invested at the live NAV; otherwise the balance carries forward to the next payments.'),
  ...figure(path.join(SCRATCH, 'flow.png'), 550, 192, 'Figure 4.2: Round-up and investment flow'),
  H2('4.3 Core Algorithms'),
  PB('**Round-up.** For an amount A in paise and a step of m rupees, the step is s = 100 × m paise, the rounded amount is R = ⌈A / s⌉ × s and the round-up is R − A. For example, A = 3200 paise and m = 5 give R = 3500 and a round-up of 300 paise (₹3). An amount that is already a multiple of the step produces no round-up.'),
  PB('**Carry-forward.** If the wallet balance B is below the fund minimum M, the investment is refused and the shortfall M − B is shown; the whole balance carries forward. If B ≥ M, the user may invest any amount between M and B.'),
  PB('**Units.** Units allotted = ⌊(amount in rupees ÷ NAV) × 1000⌋ ÷ 1000, that is, rounded down to three decimal places as mutual funds do. Current value = units × latest NAV.'),
  H2('4.4 Data Model'),
  tableCaption('Table 4.1: Main collections in MongoDB'),
  table([1700, 6600], [
    ['Collection', 'Key fields'],
    ['User', 'phone, name, pinHash, defaultMultiple, selectedFund, riskProfile, failedPinAttempts, lockedUntil'],
    ['Wallet', 'balancePaise, totalRoundUpsPaise, totalTopUpsPaise, totalInvestedPaise'],
    ['Transaction', 'merchant, category, amountPaise, roundedPaise, roundUpPaise, multiple'],
    ['Investment', 'fund, amountPaise, nav, units'],
    ['Fund', 'schemeCode, category, minInvestmentPaise, latestNav, navHistory, retired'],
    ['TopUp, Goal, Otp', 'amountPaise; title and target; hashed one-time code with expiry'],
  ]),
  H2('4.5 Fund Suggestion: Rules Decide, AI Explains'),
  P('Financial suggestions should not depend on the output of a language model, so the decision is made by fixed rules. The user answers three questions, each scored from 0 to 2: investment horizon (under 1 year, 1 to 3 years, over 3 years), reaction to a 20% fall (sell, wait, buy more) and income regularity (irregular or steady). The total score from 0 to 6 maps to a category: 0–2 Large Cap, 3–4 Mid Cap and 5–6 Small Cap. If the horizon is under one year, Large Cap is chosen regardless of the score. The language model only turns these computed facts into a short explanation; the reply is checked for invented numbers, forbidden words such as “guaranteed” and length, and a template explanation is used whenever a check fails.'),
  H2('4.6 Security Design'),
  ...bullets([
    'PINs and one-time passwords are hashed with bcrypt; sessions use signed JSON Web Tokens.',
    'Every payment must be confirmed with the PIN; five wrong PINs lock the account for 15 minutes.',
    'All request bodies are validated with zod; helmet, a CORS allow-list, a 20 KB body limit and rate limits protect the API.',
    'The wallet debit for an investment only succeeds if the balance still covers the amount, so a double tap cannot overspend.',
  ]),
];

const ch5 = [
  H1('Chapter 5: Implementation'),
  H2('5.1 Project Structure'),
  P('The repository contains three TypeScript packages: client (the React application), server (the Express API with routes, services and Mongoose models) and shared (pure functions and types used by both). Strict TypeScript is used everywhere, so the request and response types are checked at compile time on both sides.'),
  H2('5.2 Round-Up Logic'),
  P('The round-up rule is a small pure function in the shared package. The client uses it to preview the breakdown before payment and the server uses the same function to record the payment.'),
  ...code([
    'export function calculateRoundUp(',
    '  amountPaise: number, multipleRupees: number,',
    ') {',
    '  const step = multipleRupees * 100',
    '  const rounded = Math.ceil(amountPaise / step) * step',
    '  return { amountPaise, roundedPaise: rounded,',
    '           roundUpPaise: rounded - amountPaise }',
    '}',
  ]),
  H2('5.3 Atomic Wallet Updates'),
  P('Every money movement runs inside a MongoDB transaction together with the record it creates, so the wallet and the history can never disagree. For investments, the debit is conditional on the balance, which also protects against duplicate requests:'),
  ...code([
    'await mongoose.connection.transaction(async (session) => {',
    '  // debit only if the balance still covers the amount',
    '  const debit = await Wallet.updateOne(',
    '    { user: userId, balancePaise: { $gte: amount } },',
    '    { $inc: { balancePaise: -amount,',
    '              totalInvestedPaise: amount } },',
    '    { session })',
    '  if (debit.modifiedCount !== 1)',
    '    throw new HttpError(409, \'balance_changed\', ...)',
    '  await Investment.create([{ user: userId,',
    '    fund: fund._id, amountPaise: amount, nav,',
    '    units: unitsFor(amount, nav) }], { session })',
    '})',
  ]),
  H2('5.4 Real Fund Data and Metrics'),
  P('The three funds are real index funds: UTI Nifty 50 Index Fund (Large Cap), Motilal Oswal Nifty Midcap 150 Index Fund (Mid Cap) and Motilal Oswal Nifty Smallcap 250 Index Fund (Small Cap). Their NAV history is fetched from mfapi.in with a six-second timeout and cached for six hours; if the source is unavailable, the last good NAV is used. From this history the shared package computes returns over 1, 3, 12 and 36 months, the maximum drawdown and the annualised volatility, calculated as the standard deviation of daily NAV changes multiplied by √252 trading days. When a fund is replaced, the old fund is marked as retired rather than overwritten, so existing holdings continue to be valued at their own scheme’s NAV.'),
  H2('5.5 AI Advisor and Assistant'),
  P('The AI features use the Groq API. The fund suggestion is decided by the rules of Section 4.5 and only worded by the model. The “Ask RupeeRound AI” assistant answers mutual-fund questions only: off-topic questions receive one fixed refusal message, and the model is instructed never to predict returns or tell the user to buy or sell. It can call two tools, search_funds and get_fund_data, to look up any Indian mutual fund on mfapi.in; the returns and volatility in those results are computed in code, not by the model. If the AI service fails, the application still responds and falls back gracefully.'),
  H2('5.6 “What if?” Backtest'),
  P('The backtest shows how round-ups would have grown in the past. Four spending profiles (college student, first job, daily commuter and household) generate a repeatable set of everyday payments using a seeded random number generator. The payments are replayed day by day with the same round-up and carry-forward rules: on each NAV day the wallet is invested at that day’s real NAV once it covers the minimum. Payments on holidays are invested on the next NAV day. The backtest runs entirely in the browser in a few milliseconds and compares all five round-up steps at once. Results are presented in Section 6.4.'),
  new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: true, children: [new TextRun({ text: '5.7 User Interface', font: FONT })] }),
  P('The interface is mobile-first and is designed for a 6.5-inch phone, with a dark theme by default and a light theme option. On desktop the application is shown inside a phone frame. It can be installed on a phone as a Progressive Web App, and it shows loading skeletons instead of spinners and subtle animations that respect the reduced-motion setting.'),
  P('Figure 5.1 shows the four most important screens. The Home screen shows today’s spare change, the fund the user is saving towards with its live NAV, and progress towards the fund minimum. The Pay screen scans a UPI QR code or accepts a shop and amount and shows the round-up breakdown before the payment is confirmed with the PIN. The Portfolio screen shows the current value, total returns and each holding. The “What if?” screen runs the backtest described in Section 5.6.'),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [img(path.join(SCRATCH, 'screens.png'), 550, 300)] }),
  caption('Figure 5.1: Main screens of the RupeeRound application'),
];

const ch6 = [
  H1('Chapter 6: Testing and Results'),
  H2('6.1 Unit Testing'),
  P('Unit tests cover the parts of the system where a mistake would cost money or trust. They are written with Node’s built-in test runner and run with a single command; all 42 tests pass, and the whole codebase passes strict TypeScript type checking.'),
  tableCaption('Table 6.1: Unit test summary'),
  table([2900, 4300, 1100], [
    ['Test file', 'What is verified', 'Tests'],
    ['shared/money.test.ts', 'Paise parsing and formatting, round-up edge cases', '9'],
    ['shared/metrics.test.ts', 'Returns, annualised volatility, drawdown, broken NAV values', '10'],
    ['shared/backtest.test.ts', 'Repeatable profiles, carry-forward, investing at the correct NAV', '6'],
    ['server/advisorRules.test.ts', 'Risk score table, category mapping, short-horizon rule, reply checks', '12'],
    ['server/assistantText.test.ts', 'Refusal detection and reply clean-up for the AI assistant', '5'],
    ['Total', '', '42'],
  ]),
  H2('6.2 Functional Testing'),
  tableCaption('Table 6.2: Functional test cases'),
  table([600, 3200, 3500, 1000], [
    ['No.', 'Test case', 'Expected result', 'Result'],
    ['1', 'Log in with demo phone and PIN', 'Session created, Home shows wallet and funds', 'Pass'],
    ['2', 'Pay ₹32 with a ₹5 step', 'Paid ₹35, ₹3 credited to wallet', 'Pass'],
    ['3', 'Invest with wallet below minimum', 'Refused with shortfall; balance carries forward', 'Pass'],
    ['4', 'Invest with wallet above minimum', 'Units allotted at latest NAV, shown in portfolio', 'Pass'],
    ['5', 'Invest in a retired fund', 'Refused: fund no longer offered', 'Pass'],
    ['6', 'Five wrong PINs', 'Account locked for 15 minutes', 'Pass'],
    ['7', 'Ask the AI “Is small cap risky?”', 'Plain answer using real fund data', 'Pass'],
    ['8', 'Ask the AI an off-topic question', 'Fixed refusal message', 'Pass'],
  ]),
  H2('6.3 Fund Metrics'),
  P('Table 6.3 shows the metrics computed from real NAV history for the three funds over the year ending 18 November 2026. Volatility rises from Large Cap to Small Cap, as expected.'),
  tableCaption('Table 6.3: One-year fund metrics (NAV date 18 Nov 2026)'),
  table([3500, 1600, 1600, 1600], [
    ['Fund', '1-year return', 'Annualised volatility', 'Maximum drawdown'],
    ['UTI Nifty 50 Index (Large Cap)', '−1.81%', '14.11%', '15.13%'],
    ['Motilal Oswal Midcap 150 Index', '+0.69%', '16.64%', '13.93%'],
    ['Motilal Oswal Smallcap 250 Index', '+3.95%', '18.05%', '18.33%'],
  ]),
  H2('6.4 Backtest Results'),
  P('Table 6.4 shows the backtest for each spending profile with a ₹10 step in the Nifty 50 index fund. Although the fund itself returned −1.81% over the year, every profile ended with a gain on the amount invested, which illustrates rupee-cost averaging.'),
  tableCaption('Table 6.4: One-year backtest, ₹10 step, UTI Nifty 50 Index Fund'),
  table([2200, 1500, 1600, 1500, 1500], [
    ['Profile', 'Payments', 'Round-ups saved', 'Value today', 'Gain on invested'],
    ['College student', '1,283', '₹5,630', '₹5,932', '5.5%'],
    ['First job', '1,096', '₹4,938', '₹5,213', '5.6%'],
    ['Daily commuter', '1,661', '₹7,333', '₹7,748', '5.7%'],
    ['Household', '879', '₹3,895', '₹4,114', '5.7%'],
  ]),
  P('Over three years the same profiles gained between 8.4% and 8.5% on the amount invested in the Nifty 50 fund. Each backtest completed in under 3 ms in the browser, allowing results to update instantly as the user changes the profile, fund, period or step.'),
];

const ch7 = [
  H1('Chapter 7: Conclusion and Future Scope'),
  H2('7.1 Conclusion'),
  P('RupeeRound shows that everyday UPI payments can be turned into a simple, automatic investment habit. The application rounds up payments, saves the spare change, carries it forward until a fund minimum is met and then invests it in real index funds at real prices. Money is handled exactly in integer paise and every change is atomic. The design keeps decisions in transparent, tested rules and uses AI only to explain and to answer questions, which keeps the advice honest. The backtest makes the benefit visible with real data, and the mobile-first interface makes the whole process easy to follow for first-time investors.'),
  H2('7.2 Limitations'),
  ...bullets([
    'Payments and investments are simulated; fund minimums are demo values.',
    'Only payments made inside the application are rounded up.',
    'Login uses phone number, a demonstration OTP and a 4-digit PIN; production-grade identity verification is not included.',
    'The free hosting tiers used can delay the first request after a period of inactivity.',
  ]),
  H2('7.3 Future Scope'),
  ...bullets([
    '**Real money movement:** collect round-ups through a UPI AutoPay mandate via a payment partner, and place orders through a registered mutual-fund distributor.',
    '**Spending from any app:** detect payments made in other UPI apps through the RBI Account Aggregator framework, with user consent.',
    '**KYC and stronger login:** PAN and Aadhaar based KYC, Google sign-in, email OTP, refresh tokens and passkeys or fingerprint login.',
    '**Order lifecycle and redemption:** pending orders allotted at the next NAV, and withdrawal of investments.',
    '**Engagement:** goals, automatic investing, notifications, saving streaks and monthly spending insights.',
    '**Accessibility:** a voice assistant in Hindi and other Indian languages.',
  ]),
];

const refs = [
  H1('References'),
  ...numbered([
    'National Payments Corporation of India, “Unified Payments Interface (UPI) – Product Overview.” https://www.npci.org.in/',
    'Securities and Exchange Board of India, “Categorization and Rationalization of Mutual Fund Schemes,” Circular, 6 October 2017. https://www.sebi.gov.in/',
    'Association of Mutual Funds in India (AMFI), “Mutual Fund Investor Education.” https://www.amfiindia.com/',
    'MFapi.in, “Indian Mutual Fund NAV API.” https://www.mfapi.in/',
    'Acorns, “How Round-Ups Work.” https://www.acorns.com/',
    'React documentation. https://react.dev/',
    'Express documentation. https://expressjs.com/',
    'MongoDB documentation, “Transactions.” https://www.mongodb.com/docs/manual/core/transactions/',
    'Groq documentation. https://console.groq.com/docs',
    'Reserve Bank of India, “Account Aggregator Framework.” https://www.rbi.org.in/',
  ], 'refs'),
];

/* ---------- document ---------- */
const doc = new Document({
  creator: 'Aditya Narayan',
  title: 'RupeeRound Project Report',
  description: TITLE,
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 32, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 360 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 26, bold: true }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'TOC1', name: 'toc 1', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { line: 264, before: 60, after: 0 } } },
      { id: 'TOC2', name: 'toc 2', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 23 }, paragraph: { spacing: { line: 264, before: 0, after: 0 }, indent: { left: 360 } } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      ...['numbers', 'objectives', 'fr', 'refs'].map((reference) => ({
        reference, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: reference === 'refs' ? '[%1]' : '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 400 } } } }],
      })),
    ],
  },
  sections: [
    { properties: sectionProps(), children: cover },
    { properties: sectionProps({ start: 1, formatType: NumberFormat.LOWER_ROMAN }), footers: { default: pageNumFooter() },
      children: [...certificate, ...declaration, ...acknowledgement, ...abstract, ...contents] },
    { properties: sectionProps({ start: 1, formatType: NumberFormat.DECIMAL }), footers: { default: pageNumFooter() },
      children: [...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...refs] },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('wrote', OUT); });
