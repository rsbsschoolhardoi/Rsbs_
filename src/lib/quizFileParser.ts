import Papa from 'papaparse';
import { QuizDifficulty } from '@/types';

export interface ImportedQuestion {
  question_text: string;
  options: string[];
  correct_index: number;
  correct_option_text?: string;
  explanation?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: QuizDifficulty;
  marks?: number;
  question_id?: string;
  class?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  errors?: string[];
  raw?: Record<string, unknown>;
}

export interface ColumnMapping {
  question: string | null;
  options: { original: string; index: number }[];
  combinedOptions: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  difficulty: string | null;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  class: string | null;
  source: string | null;
  marks: string | null;
  id: string | null;
  unmatched: string[];
}

export interface ParseResult {
  questions: ImportedQuestion[];
  mapping: ColumnMapping;
}

const DIFFICULTY_MAP: Record<string, QuizDifficulty> = {
  easy: 'easy', e: 'easy', simple: 'easy', basic: 'easy',
  medium: 'medium', med: 'medium', moderate: 'medium', average: 'medium',
  hard: 'hard', h: 'hard', difficult: 'hard', tough: 'hard', advanced: 'hard',
};

function normalizeDifficulty(value: unknown): QuizDifficulty | undefined {
  if (typeof value === 'string') {
    const mapped = DIFFICULTY_MAP[value.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

function normalizeHeader(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function getValue(row: Record<string, unknown>, header: string | null): unknown {
  if (!header) return undefined;
  return row[header];
}

function getString(row: Record<string, unknown>, header: string | null): string {
  const value = getValue(row, header);
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/* ──────────────────────────────
   Column detection
   ────────────────────────────── */

function isQuestionHeader(name: string): boolean {
  const questionPatterns = [
    'question', 'question text', 'questiontext', 'question name', 'question body',
    'question prompt', 'question statement', 'question item', 'question stem',
    'prompt', 'stem', 'query', 'problem', 'problem statement', 'task', 'item',
    'item stem', 'title',
  ];
  if (questionPatterns.includes(name)) return true;
  if (name.startsWith('question ') && !name.includes('id') && !name.includes('no') && !name.includes('number')) return true;
  return false;
}

function parseOptionIndex(name: string): number | null {
  // Single letter A-F
  if (/^[a-f]$/.test(name)) return name.charCodeAt(0) - 97;

  // option A, choice B, answer C, opt A
  const letterMatch = name.match(/^(?:option|opt|choice|answer)\s*([a-f])$/);
  if (letterMatch) return letterMatch[1].charCodeAt(0) - 97;

  // option 1, choice 2, answer 3
  const digitMatch = name.match(/^(?:option|opt|choice|answer)\s*(\d+)$/);
  if (digitMatch) {
    const idx = Number(digitMatch[1]) - 1;
    if (idx >= 0) return idx;
  }

  return null;
}

function isCombinedOptionsHeader(name: string): boolean {
  return ['options', 'choices', 'answers', 'option list', 'choice list', 'answer list',
    'all options', 'option set', 'possible answers', 'possible options', 'answer options'].includes(name);
}

function isCorrectAnswerHeader(name: string): boolean {
  return [
    'correct answer', 'correct', 'answer', 'correct option', 'answer key', 'key',
    'correct answer key', 'correct answer index', 'right answer', 'right option',
    'answer option', 'correct choice', 'correct answer text', 'correct option text',
    'correct answer value', 'correct', 'answer',
  ].includes(name);
}

function isExplanationHeader(name: string): boolean {
  return [
    'explanation', 'explain', 'solution', 'rationale', 'reason', 'answer explanation',
    'explanation text', 'description', 'note', 'commentary', 'answer rationale',
    'solution text', 'justification', 'reasoning',
  ].includes(name);
}

function isDifficultyHeader(name: string): boolean {
  return ['difficulty', 'level', 'diff', 'complexity', 'question difficulty', 'difficulty level'].includes(name);
}

function isSubjectHeader(name: string): boolean {
  return ['subject', 'subject name', 'discipline', 'subject area', 'course', 'stream'].includes(name);
}

function isClassHeader(name: string): boolean {
  return ['class', 'grade', 'standard', 'year', 'class name', 'class level', 'standard name'].includes(name);
}

function isChapterHeader(name: string): boolean {
  return ['chapter', 'unit', 'section', 'module', 'chapter name', 'unit name', 'chapter title'].includes(name);
}

function isTopicHeader(name: string): boolean {
  return ['topic', 'category', 'lesson', 'theme', 'topic name', 'topic title', 'topic category',
    'subject topic', 'topic area', 'category name'].includes(name);
}

function isSourceHeader(name: string): boolean {
  return ['source', 'reference', 'origin', 'source name', 'question source', 'from',
    'reference text', 'source text', 'citation', 'ref'].includes(name);
}

function isMarksHeader(name: string): boolean {
  return ['marks', 'score', 'points', 'weight', 'mark', 'score value', 'marks value',
    'question marks', 'weightage', 'question score', 'point'].includes(name);
}

function isIdHeader(name: string): boolean {
  const idPatterns = [
    'id', 'question id', 'question_id', 'qid', 'question no', 'question number',
    'no', 'sno', 'serial', 'serial no', 'serial number', 'question code',
    'question ref', 'question reference', 'reference id', 'question identifier',
    'item id', 'item number', 'item no',
  ];
  if (idPatterns.includes(name)) return true;
  if (name === 'id') return true;
  if (name.startsWith('question ') && (name.includes('id') || name.includes('no') || name.includes('number'))) return true;
  return false;
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    question: null,
    options: [],
    combinedOptions: null,
    correctAnswer: null,
    explanation: null,
    difficulty: null,
    subject: null,
    chapter: null,
    topic: null,
    class: null,
    source: null,
    marks: null,
    id: null,
    unmatched: [],
  };

  const candidates = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }));

  for (const { original, normalized } of candidates) {
    const optionIndex = parseOptionIndex(normalized);
    if (optionIndex !== null) {
      mapping.options.push({ original, index: optionIndex });
      continue;
    }

    if (!mapping.question && isQuestionHeader(normalized)) {
      mapping.question = original;
      continue;
    }

    if (!mapping.combinedOptions && isCombinedOptionsHeader(normalized)) {
      mapping.combinedOptions = original;
      continue;
    }

    if (!mapping.correctAnswer && isCorrectAnswerHeader(normalized)) {
      mapping.correctAnswer = original;
      continue;
    }

    if (!mapping.explanation && isExplanationHeader(normalized)) {
      mapping.explanation = original;
      continue;
    }

    if (!mapping.difficulty && isDifficultyHeader(normalized)) {
      mapping.difficulty = original;
      continue;
    }

    if (!mapping.subject && isSubjectHeader(normalized)) {
      mapping.subject = original;
      continue;
    }

    if (!mapping.chapter && isChapterHeader(normalized)) {
      mapping.chapter = original;
      continue;
    }

    if (!mapping.topic && isTopicHeader(normalized)) {
      mapping.topic = original;
      continue;
    }

    if (!mapping.class && isClassHeader(normalized)) {
      mapping.class = original;
      continue;
    }

    if (!mapping.source && isSourceHeader(normalized)) {
      mapping.source = original;
      continue;
    }

    if (!mapping.marks && isMarksHeader(normalized)) {
      mapping.marks = original;
      continue;
    }

    if (!mapping.id && isIdHeader(normalized)) {
      mapping.id = original;
      continue;
    }

    mapping.unmatched.push(original);
  }

  // Sort options by index
  mapping.options.sort((a, b) => a.index - b.index);

  // If we have explicit options, ignore the combined options column
  if (mapping.options.length > 0) {
    mapping.combinedOptions = null;
  }

  return mapping;
}

/* ──────────────────────────────
   Option parsing
   ────────────────────────────── */

function parseCombinedOptions(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v !== '');
  }

  let text = String(value).trim();
  if (!text) return [];

  // Try newline-based list with labels (A. X, A) X, Option A: X, A: X)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  if (lines.length >= 2) {
    const parsed = lines
      .map((line) => {
        const match = line.match(/^\s*(?:option\s*)?([a-f])\s*[.):\-]\s*(.+)$/i);
        if (match) return match[2].trim();
        const shortMatch = line.match(/^\s*([a-f])\s*[.):\-]\s*(.+)$/i);
        if (shortMatch) return shortMatch[2].trim();
        return line;
      })
      .filter((l) => l !== '');
    if (parsed.length >= 2) return parsed;
  }

  // Try delimiters: pipe, semicolon, forward slash
  for (const delimiter of ['|', ';', '/']) {
    if (text.includes(delimiter)) {
      const parts = text.split(delimiter).map((p) => p.trim()).filter((p) => p !== '');
      if (parts.length >= 2) return parts;
    }
  }

  // Try JSON array
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => String(p).trim()).filter((p) => p !== '');
    }
  } catch {
    // ignore
  }

  return [];
}

function getOptions(row: Record<string, unknown>, mapping: ColumnMapping): string[] {
  if (mapping.options.length > 0) {
    const maxIndex = Math.max(...mapping.options.map((o) => o.index), -1);
    const options: string[] = [];
    for (let i = 0; i <= maxIndex; i++) {
      const col = mapping.options.find((o) => o.index === i);
      options[i] = col ? String(row[col.original] ?? '').trim() : '';
    }
    return options.filter((o) => o !== '');
  }

  if (mapping.combinedOptions) {
    return parseCombinedOptions(row[mapping.combinedOptions]);
  }

  // Fallback: attempt to extract options from any keys that look like options
  return legacyOptionDetection(row);
}

function legacyOptionDetection(row: Record<string, unknown>): string[] {
  const options: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue;
    const normalized = normalizeHeader(key);
    const idx = parseOptionIndex(normalized);
    if (idx !== null) {
      options[idx] = String(value).trim();
    }
  }
  return options.filter((o) => o !== undefined && o !== '');
}

/* ──────────────────────────────
   Correct answer detection
   ────────────────────────────── */

function detectCorrectAnswer(row: Record<string, unknown>, mapping: ColumnMapping, options: string[]): number {
  const raw = getValue(row, mapping.correctAnswer);
  if (raw === undefined || raw === null) return -1;

  const value = String(raw).trim();
  if (!value) return -1;

  const lower = value.toLowerCase();

  // Option A / Option B
  const optionLetterMatch = lower.match(/^\s*(?:option\s*)?([a-f])\s*$/);
  if (optionLetterMatch) {
    return optionLetterMatch[1].charCodeAt(0) - 97;
  }

  // Single letter A-D
  if (lower.length === 1 && lower >= 'a' && lower <= 'f') {
    return lower.charCodeAt(0) - 97;
  }

  // Numeric 1/2/3/4
  const idx = Number(value);
  if (!isNaN(idx)) {
    if (idx >= 1 && idx <= options.length) return idx - 1;
    if (idx >= 0 && idx < options.length) return idx;
  }

  // Exact option text match
  const exactMatch = options.findIndex((o) => o.toLowerCase() === lower);
  if (exactMatch >= 0) return exactMatch;

  // Substring match (case-insensitive)
  const substringMatch = options.findIndex((o) => lower === o.toLowerCase().trim());
  if (substringMatch >= 0) return substringMatch;

  return -1;
}

/* ──────────────────────────────
   Row to question
   ────────────────────────────── */

function rowToQuestion(row: Record<string, unknown>, mapping: ColumnMapping): ImportedQuestion {
  const options = getOptions(row, mapping);
  const correctIndex = detectCorrectAnswer(row, mapping, options);
  const errors: string[] = [];

  const questionText = getString(row, mapping.question);

  if (!questionText) errors.push('Question text missing');
  if (options.length < 2) errors.push('At least two options are required');
  if (correctIndex < 0) errors.push('Correct answer not detected');
  if (correctIndex >= 0 && correctIndex >= options.length) errors.push('Correct answer index out of range');

  return {
    question_text: questionText,
    options,
    correct_index: correctIndex,
    correct_option_text: correctIndex >= 0 ? options[correctIndex] : undefined,
    explanation: getString(row, mapping.explanation) || undefined,
    subject: getString(row, mapping.subject) || undefined,
    chapter: getString(row, mapping.chapter) || undefined,
    topic: getString(row, mapping.topic) || undefined,
    class: getString(row, mapping.class) || undefined,
    source: getString(row, mapping.source) || undefined,
    difficulty: normalizeDifficulty(getValue(row, mapping.difficulty)),
    marks: normalizeNumber(getValue(row, mapping.marks)),
    question_id: getString(row, mapping.id) || undefined,
    metadata: row,
    errors: errors.length > 0 ? errors : undefined,
    raw: row,
  };
}

/* ──────────────────────────────
   Format parsers
   ────────────────────────────── */

function getMapping(rows: Record<string, unknown>[]): ColumnMapping {
  if (rows.length === 0) {
    return {
      question: null, options: [], combinedOptions: null, correctAnswer: null,
      explanation: null, difficulty: null, subject: null, chapter: null,
      topic: null, class: null, source: null, marks: null, id: null, unmatched: [],
    };
  }
  return detectColumnMapping(Object.keys(rows[0]));
}

function parseJson(data: string): ParseResult {
  const trimmed = data.trim();
  const emptyResult: ParseResult = { questions: [], mapping: getMapping([]) };
  if (!trimmed) return emptyResult;
  try {
    const parsed = JSON.parse(trimmed);
    const rows = (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
    const mapping = getMapping(rows);
    return { questions: rows.map((row) => rowToQuestion(row, mapping)), mapping };
  } catch {
    return emptyResult;
  }
}

function parseJsonl(data: string): ParseResult {
  const rows: Record<string, unknown>[] = [];
  data.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // ignore invalid lines
    }
  });
  const mapping = getMapping(rows);
  return {
    questions: rows.map((row) => rowToQuestion(row, mapping)),
    mapping,
  };
}

async function parseXlsx(file: File): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  const mapping = getMapping(rows);
  return { questions: rows.map((row) => rowToQuestion(row, mapping)), mapping };
}

function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = (result.data || []) as Record<string, unknown>[];
        const mapping = getMapping(rows);
        resolve({ questions: rows.map((row) => rowToQuestion(row, mapping)), mapping });
      },
      error: () => resolve({ questions: [], mapping: getMapping([]) }),
    });
  });
}

function parseTxt(data: string): ParseResult {
  const blocks = data.split(/\n\s*\n/).filter((b) => b.trim());
  const questions: ImportedQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
    if (lines.length === 0) continue;
    const questionText = lines[0].replace(/^\d+\s*[-.):\]]\s*/, '');
    const options: string[] = [];
    let explanation = '';
    let correctIndex = -1;
    let marks: number | undefined;
    let difficulty: QuizDifficulty | undefined;
    let subject = '';
    let chapter = '';
    let topic = '';
    let questionId = '';
    let className = '';
    let source = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (lower.match(/^\d+[\s.)]\s/) || lower.match(/^[a-f][\s.)]\s/i)) {
        const text = line.replace(/^\d+[\s.)]\s/, '').replace(/^[a-f][\s.)]\s/i, '').trim();
        options.push(text);
      } else if (lower.startsWith('explanation:') || lower.startsWith('explain:') || lower.startsWith('solution:')) {
        explanation = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('answer:') || lower.startsWith('correct:') || lower.startsWith('correct answer:')) {
        const answer = line.substring(line.indexOf(':') + 1).trim();
        if (answer.length === 1) correctIndex = answer.toLowerCase().charCodeAt(0) - 97;
        else {
          const idx = Number(answer) - 1;
          if (!isNaN(idx)) correctIndex = idx;
        }
      } else if (lower.startsWith('marks:') || lower.startsWith('points:') || lower.startsWith('score:')) {
        marks = normalizeNumber(line.substring(line.indexOf(':') + 1).trim());
      } else if (lower.startsWith('difficulty:') || lower.startsWith('level:')) {
        difficulty = normalizeDifficulty(line.substring(line.indexOf(':') + 1).trim());
      } else if (lower.startsWith('subject:')) {
        subject = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('class:') || lower.startsWith('grade:')) {
        className = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('chapter:') || lower.startsWith('unit:')) {
        chapter = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('topic:') || lower.startsWith('lesson:')) {
        topic = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('source:') || lower.startsWith('reference:')) {
        source = line.substring(line.indexOf(':') + 1).trim();
      } else if (lower.startsWith('question id:') || lower.startsWith('qid:') || lower.startsWith('id:')) {
        questionId = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.length > 0) {
        options.push(line);
      }
    }

    const errors: string[] = [];
    if (!questionText) errors.push('Question text missing');
    if (options.length < 2) errors.push('At least two options are required');
    if (correctIndex < 0) errors.push('Correct answer not detected');
    if (correctIndex >= 0 && correctIndex >= options.length) errors.push('Correct answer index out of range');

    questions.push({
      question_text: questionText,
      options,
      correct_index: correctIndex,
      correct_option_text: correctIndex >= 0 ? options[correctIndex] : undefined,
      explanation,
      subject,
      chapter,
      topic,
      class: className,
      source,
      difficulty,
      marks,
      question_id: questionId,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  return { questions, mapping: getMapping([]) };
}

export async function parseQuizFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(file);
  if (name.endsWith('.json')) return parseJson(await file.text());
  if (name.endsWith('.jsonl') || name.endsWith('.jsonlines')) return parseJsonl(await file.text());
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
  if (name.endsWith('.txt')) return parseTxt(await file.text());
  return parseCsv(file);
}
