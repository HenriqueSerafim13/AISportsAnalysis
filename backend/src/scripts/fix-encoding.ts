import DatabaseManager from '../database';
import { readFileSync } from 'fs';

function cleanText(text: string): string {
  if (!text) return '';
  
  // Remove null bytes and other invalid control characters, but preserve accented characters
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Only remove actual Unicode replacement characters, not valid accented characters
  cleaned = cleaned.replace(/\uFFFD/g, '');
  
  // Decode HTML entities (preserve the detailed entity mapping)
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&atilde;/g, 'ã')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&Otilde;/g, 'Õ')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&iacute;/g, 'í')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&icirc;/g, 'î')
    .replace(/&Icirc;/g, 'Î')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&aacute;/g, 'á')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

async function fixExistingArticles() {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();
  
  try {
    console.log('Starting to fix encoding issues in existing articles...');
    
    // Get all articles with potential encoding issues
    const stmt = db.prepare('SELECT id, title, content, summary, author FROM articles');
    const articles = stmt.all() as any[];
    
    console.log(`Found ${articles.length} articles to check...`);
    
    let fixedCount = 0;
    
    for (const article of articles) {
      const originalTitle = article.title;
      const originalContent = article.content;
      const originalSummary = article.summary;
      const originalAuthor = article.author;
      
      const cleanedTitle = cleanText(originalTitle);
      const cleanedContent = cleanText(originalContent);
      const cleanedSummary = cleanText(originalSummary);
      const cleanedAuthor = cleanText(originalAuthor);
      
      // Check if any cleaning was needed
      if (originalTitle !== cleanedTitle || 
          originalContent !== cleanedContent || 
          originalSummary !== cleanedSummary || 
          originalAuthor !== cleanedAuthor) {
        
        const updateStmt = db.prepare(`
          UPDATE articles 
          SET title = ?, content = ?, summary = ?, author = ?
          WHERE id = ?
        `);
        
        updateStmt.run(cleanedTitle, cleanedContent, cleanedSummary, cleanedAuthor, article.id);
        fixedCount++;
        
        console.log(`Fixed article ${article.id}: "${originalTitle.substring(0, 50)}..."`);
      }
    }
    
    console.log(`\nEncoding fix completed! Fixed ${fixedCount} articles.`);
    
  } catch (error) {
    console.error('Error fixing articles:', error);
  } finally {
    dbManager.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  fixExistingArticles();
}

export { fixExistingArticles };
