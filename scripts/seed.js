#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Chapter = require('../src/models/Chapter');

const SAMPLE_DATA_PATH = path.join(__dirname, '..', '..', 'all_subjects_chapter_data.json');

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function loadSampleData() {
  try {
    console.log('📖 Reading sample data...');
    const data = await fs.readFile(SAMPLE_DATA_PATH, 'utf8');
    const chaptersData = JSON.parse(data);
    
    if (!Array.isArray(chaptersData)) {
      throw new Error('Sample data must be an array');
    }
    
    // Filter out incomplete entries
    const validChapters = chaptersData.filter(chapter => 
      chapter && 
      typeof chapter === 'object' && 
      chapter.subject && 
      chapter.chapter && 
      chapter.class && 
      chapter.unit
    );
    
    console.log(`📊 Found ${validChapters.length} valid chapters out of ${chaptersData.length} entries`);
    return validChapters;
  } catch (error) {
    console.error('❌ Error loading sample data:', error);
    throw error;
  }
}

async function clearExistingData() {
  try {
    const count = await Chapter.countDocuments();
    if (count > 0) {
      console.log(`🗑️  Clearing ${count} existing chapters...`);
      await Chapter.deleteMany({});
      console.log('✅ Existing data cleared');
    } else {
      console.log('ℹ️  No existing data to clear');
    }
  } catch (error) {
    console.error('❌ Error clearing existing data:', error);
    throw error;
  }
}

async function seedDatabase(chaptersData) {
  try {
    console.log('🌱 Seeding database...');
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (let i = 0; i < chaptersData.length; i++) {
      try {
        const chapterData = chaptersData[i];
        
        // Create and save chapter
        const chapter = new Chapter(chapterData);
        const savedChapter = await chapter.save();
        
        results.successful.push({
          index: i,
          id: savedChapter._id,
          subject: savedChapter.subject,
          chapter: savedChapter.chapter
        });
        
        // Log progress every 10 chapters
        if ((i + 1) % 10 === 0) {
          console.log(`📈 Progress: ${i + 1}/${chaptersData.length} chapters processed`);
        }
      } catch (error) {
        results.failed.push({
          index: i,
          chapter: chaptersData[i],
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

async function printResults(results) {
  console.log('\n📋 SEEDING RESULTS:');
  console.log('==================');
  console.log(`✅ Successfully created: ${results.successful.length} chapters`);
  console.log(`❌ Failed to create: ${results.failed.length} chapters`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED CHAPTERS:');
    results.failed.forEach((failure, index) => {
      console.log(`${index + 1}. Index ${failure.index}: ${failure.error}`);
      if (failure.chapter) {
        console.log(`   Chapter: ${failure.chapter.subject} - ${failure.chapter.chapter}`);
      }
    });
  }
  
  if (results.successful.length > 0) {
    console.log('\n✅ SAMPLE SUCCESSFUL CHAPTERS:');
    results.successful.slice(0, 5).forEach((success, index) => {
      console.log(`${index + 1}. ${success.subject} - ${success.chapter} (ID: ${success.id})`);
    });
    
    if (results.successful.length > 5) {
      console.log(`   ... and ${results.successful.length - 5} more`);
    }
  }
}

async function generateStatistics() {
  try {
    console.log('\n📊 GENERATING STATISTICS:');
    console.log('========================');
    
    const [
      totalChapters,
      subjectDistribution,
      classDistribution,
      statusDistribution
    ] = await Promise.all([
      Chapter.countDocuments(),
      Chapter.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Chapter.aggregate([
        { $group: { _id: '$class', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Chapter.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    console.log(`📚 Total Chapters: ${totalChapters}`);
    
    console.log('\n📖 By Subject:');
    subjectDistribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} chapters`);
    });
    
    console.log('\n🎓 By Class:');
    classDistribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} chapters`);
    });
    
    console.log('\n📈 By Status:');
    statusDistribution.forEach(item => {
      console.log(`   ${item._id}: ${item.count} chapters`);
    });
    
  } catch (error) {
    console.error('❌ Error generating statistics:', error);
  }
}

async function main() {
  try {
    console.log('🌱 Chapter Performance API - Database Seeder');
    console.log('============================================\n');
    
    // Connect to database
    await connectDatabase();
    
    // Load sample data
    const chaptersData = await loadSampleData();
    
    // Clear existing data
    await clearExistingData();
    
    // Seed database
    const results = await seedDatabase(chaptersData);
    
    // Print results
    await printResults(results);
    
    // Generate statistics
    await generateStatistics();
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
    process.exit(0);
  }
}

// Run the seeder
main();
