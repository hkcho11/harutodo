export interface FeedbackAttachment {
  id: string;
  originalName: string;
  mediaType: string;
  byteSize: number;
}
export interface FeedbackReply {
  content: string;
  revision: number;
  updatedAt: string;
}
export interface Feedback {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  replyRevision: number;
  readReplyRevision: number;
  reply: FeedbackReply | null;
  attachments: FeedbackAttachment[];
}
export interface FeedbackPage {
  items: Feedback[];
  nextCursor: string | null;
}
export interface FeedbackCapabilities {
  isAdmin: boolean;
  userId: string;
}
export interface FeedbackPreferences {
  enabled: boolean;
  promptSeen: boolean;
}
export interface FeedbackCounts {
  unreadReplies: number;
  pendingFeedback: number;
  answeredFeedback: number;
}
export interface FeedbackInput {
  title: string;
  content: string;
  attachmentIds: string[];
}
