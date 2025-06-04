const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: ['Physics', 'Chemistry', 'Mathematics'],
    trim: true
  },
  chapter: {
    type: String,
    required: [true, 'Chapter name is required'],
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: ['Class 11', 'Class 12'],
    trim: true
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true
  },
  yearWiseQuestionCount: {
    type: Map,
    of: Number,
    default: new Map(),
    validate: {
      validator: function(v) {
        for (let value of v.values()) {
          if (value < 0) return false;
        }
        return true;
      },
      message: 'Question count cannot be negative'
    }
  },
  questionSolved: {
    type: Number,
    required: [true, 'Questions solved count is required'],
    min: [0, 'Questions solved cannot be negative'],
    default: 0
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started'
  },
  isWeakChapter: {
    type: Boolean,
    required: [true, 'Weak chapter flag is required'],
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
chapterSchema.index({ subject: 1, class: 1 });
chapterSchema.index({ status: 1 });
chapterSchema.index({ isWeakChapter: 1 });
chapterSchema.index({ unit: 1 });
chapterSchema.index({ chapter: 1 });

// Compound indexes for common queries
chapterSchema.index({ subject: 1, class: 1, status: 1 });
chapterSchema.index({ subject: 1, isWeakChapter: 1 });

// Virtual for total questions across all years
chapterSchema.virtual('totalQuestions').get(function() {
  if (!this.yearWiseQuestionCount) return 0;
  let total = 0;
  for (let count of this.yearWiseQuestionCount.values()) {
    total += count;
  }
  return total;
});

// Virtual for completion percentage
chapterSchema.virtual('completionPercentage').get(function() {
  const total = this.totalQuestions;
  if (total === 0) return 0;
  return Math.round((this.questionSolved / total) * 100);
});

// Static method to get filter options
chapterSchema.statics.getFilterOptions = async function() {
  const subjects = await this.distinct('subject');
  const classes = await this.distinct('class');
  const units = await this.distinct('unit');
  const statuses = await this.distinct('status');
  
  return {
    subjects,
    classes,
    units,
    statuses
  };
};

module.exports = mongoose.model('Chapter', chapterSchema);
