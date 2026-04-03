// packages/shared/src/types/feedback.ts
// AI-253: 사용자 피드백 수집 시스템

// Runtime export for TypeScript module resolution
export const FEEDBACK_TYPES_VERSION = '1.0.0' as const;

export type Genre =
  | 'fantasy'
  | 'modern'
  | 'romance'
  | 'mystery'
  | 'horror'
  | 'scifi'
  | 'thriller'
  | 'historical'
  | 'comedy';

export type FeedbackRatingCategory =
  | 'story_quality'
  | 'character_development'
  | 'pacing'
  | 'engagement'
  | 'writing_style'
  | 'overall';

export interface FeedbackRatings {
  story_quality?: number; // 1-5
  character_development?: number; // 1-5
  pacing?: number; // 1-5
  engagement?: number; // 1-5
  writing_style?: number; // 1-5
  overall?: number; // 1-5
}

export type FeedbackTag =
  | 'good_ending'
  | 'surprising_twist'
  | 'engaging_plot'
  | 'realistic_dialogue'
  | 'well_developed_characters'
  | 'immersive_world'
  | 'emotional_impact'
  | 'creative_premise'
  | 'pacing_issues'
  | 'confusing_plot'
  | 'weak_characters'
  | 'poor_dialogue'
  | 'rushed_ending';

export interface StoryFeedback {
  id: string;
  session_id: string;
  story_id: string;
  user_id: string | null;
  genre: Genre;
  ratings: FeedbackRatings;
  comments: string;
  feedback_tags: FeedbackTag[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreateInput {
  session_id: string;
  story_id: string;
  genre: Genre;
  ratings: FeedbackRatings;
  comments?: string;
  feedback_tags?: FeedbackTag[];
}

export interface FeedbackUpdateInput {
  ratings?: FeedbackRatings;
  comments?: string;
  feedback_tags?: FeedbackTag[];
}

export interface FeedbackStats {
  total_feedbacks: number;
  average_ratings: {
    [key in FeedbackRatingCategory]?: number;
  };
  genre_distribution: {
    genre: Genre;
    count: number;
    average_rating: number;
  }[];
  recent_feedbacks: StoryFeedback[];
  top_tags: {
    tag: FeedbackTag;
    count: number;
  }[];
}

export interface FeedbackAdminStats {
  total_feedbacks: number;
  unique_users: number;
  unique_sessions: number;
  genre_breakdown: {
    genre: Genre;
    count: number;
    avg_overall_rating: number;
  }[];
  rating_averages: {
    [key in FeedbackRatingCategory]?: number;
  };
  most_common_tags: {
    tag: string;
    count: number;
  }[];
  feedbacks_last_7_days: number;
  feedbacks_last_30_days: number;
}
