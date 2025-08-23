import DatabaseManager from './src/database';
import JobManager from './src/services/JobManager';

async function testJobManager() {
  try {
    console.log('Initializing database...');
    DatabaseManager.getInstance();
    
    console.log('\n=== Testing JobManager RSS Fetch ===');
    
    // Create a job to fetch the Noticias feed
    const jobId = await JobManager.createJob('rss_fetch', { feedId: 2 });
    console.log('Created job with ID:', jobId);
    
    console.log('\n=== Processing Job ===');
    await JobManager.processJob(jobId);
    
    console.log('\n=== Job Status ===');
    const job = await JobManager.getJob(jobId);
    console.log('Job status:', job?.status);
    console.log('Job data:', job?.data);
    console.log('Job error:', job?.error);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testJobManager();
