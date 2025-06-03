const badWords = [
  // Từ tiếng Việt
  "đồ chó",
  "con chó",
  "thằng chó",
  "con điên",
  "đồ điên",
  "ngu ngốc",
  "đồ ngu",
  "chết tiệt",
  "đồ khốn",
  "thằng khốn",
  "con khốn",
  "đồ súc sinh",
  "súc sinh",
  "đồ bẩn",
  "thối tha",
  "tởm lợm",
  "kinh tởm",
  "đồ rác",
  "rác rưởi",
  "cút đi",
  "biến đi",
  "đi chết đi",
  "đồ khùng",
  "điên khùng",
  // Từ tiếng Anh
  "fuck",
  "shit",
  "damn",
  "asshole",
  "bitch",
  "bastard",
  "stupid",
  "idiot",
  "moron",
  "dumb",
  "retard",
  "crazy",
  "insane",
  "garbage",
  "trash",
];

const checkProfanity = (text) => {
  if (!text) return { hasProfanity: false, foundWords: [], cleanText: text };
  
  const lowerText = text.toLowerCase();
  const foundBadWords = [];

  badWords.forEach((word) => {
    if (lowerText.includes(word.toLowerCase())) {
      foundBadWords.push(word);
    }
  });

  // Làm sạch text
  let cleanText = text;
  foundBadWords.forEach((word) => {
    const regex = new RegExp(word, 'gi');
    cleanText = cleanText.replace(regex, '*'.repeat(word.length));
  });

  return {
    hasProfanity: foundBadWords.length > 0,
    foundWords: foundBadWords,
    cleanText: cleanText,
  };
};

// AI-powered profanity detection (sử dụng pattern matching nâng cao)
const aiProfanityCheck = (text) => {
  if (!text) return { isSuspicious: false, foundPatterns: [], confidence: 0 };
  
  // Patterns cho từ ngữ tiêu cực
  const negativePatterns = [
    /\b(rất|cực kỳ|quá|siêu)\s+(tệ|dở|kém|tồi)\b/gi,
    /\b(không|chẳng|chả)\s+(ra gì|làm sao|được gì)\b/gi,
    /\b(lừa đảo|lừa gặt|lót da|móc túi)\b/gi,
    /\b(dịch vụ|phục vụ|thái độ)\s+(tệ|dở|kém|thối)\b/gi,
    /\b(đánh giá|review)\s+(ảo|lừa|giả)\b/gi,
  ];

  let suspiciousContent = false;
  const foundPatterns = [];

  negativePatterns.forEach((pattern, index) => {
    if (pattern.test(text)) {
      suspiciousContent = true;
      foundPatterns.push(`Pattern ${index + 1}`);
    }
  });

  return {
    isSuspicious: suspiciousContent,
    foundPatterns,
    confidence: foundPatterns.length > 0 ? foundPatterns.length * 0.3 : 0
  };
};

module.exports = { checkProfanity, aiProfanityCheck };
