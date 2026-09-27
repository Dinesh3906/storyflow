import { z } from 'zod';

export const LanguageCodeSchema = z.enum([
  'auto',
  'en',
  'te',
  'hi',
  'ta',
  'kn',
  'bn',
  'mixed',
  'unknown',
]);

export const ScriptModeSchema = z.enum(['romanized', 'original', 'english']);

export const StoryStyleSchema = z.enum([
  'narrative',
  'screenplay',
  'poetry',
  'short_story',
  'novel',
  'journal',
  'script',
  'dialogue',
  'custom',
]);

export const WritingModeSchema = z.enum(['faithful', 'literary']);

export const RealtimeModeSchema = z.enum(['fast', 'balanced', 'writing']);

// Authentication Schemas
export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// Project Schemas
export const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(100),
  description: z.string().max(500).optional(),
});

// Story Schemas
export const CreateStorySchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Story title is required').max(200),
  language: LanguageCodeSchema.default('auto'),
  scriptMode: ScriptModeSchema.default('romanized'),
  style: StoryStyleSchema.default('narrative'),
  writingMode: WritingModeSchema.default('faithful'),
  realtimeMode: RealtimeModeSchema.default('balanced'),
});

export const UpdateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  language: LanguageCodeSchema.optional(),
  scriptMode: ScriptModeSchema.optional(),
  style: StoryStyleSchema.optional(),
  writingMode: WritingModeSchema.optional(),
  realtimeMode: RealtimeModeSchema.optional(),
  processedText: z.string().optional(),
  rawTranscript: z.string().optional(),
});

// Realtime Session Start Payload Schema
export const SessionStartSchema = z.object({
  storyId: z.string().uuid(),
  userId: z.string().uuid(),
  language: LanguageCodeSchema.default('auto'),
  scriptMode: ScriptModeSchema.default('romanized'),
  style: StoryStyleSchema.default('narrative'),
  writingMode: WritingModeSchema.default('faithful'),
  realtimeMode: RealtimeModeSchema.default('balanced'),
  sampleRate: z.number().int().min(8000).max(48000).default(16000),
});

// AI Transformation Request Schema
export const AITransformRequestSchema = z.object({
  action: z.enum([
    'clean_up',
    'rewrite',
    'continue',
    'shorten',
    'expand',
    'make_literary',
    'make_simple',
    'convert_dialogue',
    'convert_script',
    'convert_poetry',
  ]),
  selectedText: z.string().min(1, 'Selected text cannot be empty'),
  fullStoryContext: z.string().optional(),
  language: LanguageCodeSchema,
  scriptMode: ScriptModeSchema,
  style: StoryStyleSchema,
  writingMode: WritingModeSchema,
});

// Export Request Schema
export const ExportRequestSchema = z.object({
  storyId: z.string().uuid(),
  format: z.enum(['pdf', 'docx', 'markdown', 'txt']).default('pdf'),
  options: z
    .object({
      includeTitlePage: z.boolean().default(true),
      includeAuthor: z.boolean().default(true),
      authorName: z.string().optional(),
      fontSize: z.number().min(8).max(18).default(12),
      lineSpacing: z.number().min(1).max(2.5).default(1.5),
      fontFamily: z.enum(['serif', 'sans', 'mono']).default('serif'),
    })
    .optional(),
});
