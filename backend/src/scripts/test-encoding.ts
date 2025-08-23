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

function testEncoding() {
  console.log('Testing text cleaning function...\n');
  
  // Test cases
  const testCases = [
    // Valid Portuguese text with accents - should be preserved
    'João, José, açúcar, coração, pão',
    'Futebol português é fantástico',
    'Benfica, Sporting, FC Porto são grandes',
    
    // HTML entities - should be decoded
    'Jo&atilde;o &eacute; portugu&ecirc;s',
    'Futebol &eacute; fant&aacute;stico',
    'A&ccedil;&uacute;car doce',
    
    // Mixed content
    'Portugal vs Espanha: João &amp; José',
    'Cora&ccedil;&atilde;o de Portugal',
    
    // Invalid characters that should be removed
    'Test\x00with\x1Fnull\x7Fbytes',
    'Text with \uFFFD replacement char',
  ];
  
  testCases.forEach((testCase, index) => {
    const original = testCase;
    const cleaned = cleanText(testCase);
    
    console.log(`Test ${index + 1}:`);
    console.log(`Original: "${original}"`);
    console.log(`Cleaned:  "${cleaned}"`);
    console.log(`Changed:  ${original !== cleaned ? 'YES' : 'NO'}`);
    console.log('---');
  });
}

// Run the test if called directly
if (require.main === module) {
  testEncoding();
}

export { cleanText, testEncoding };
