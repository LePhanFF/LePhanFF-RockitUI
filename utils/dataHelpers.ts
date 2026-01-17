
import { DecodedOutput } from '../types';

export const GCS_BUCKET_BASE = "https://storage.googleapis.com/rockit-data"; 
export const PLAYBOOK_URL = "https://storage.googleapis.com/rockit-data/inference/playbooks.md";
export const PSYCH_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-psychology.md";

// Data Sources - Google Drive Export Links
export const CSV_URLS = {
    'nq': 'https://drive.google.com/uc?id=17pcZ1QKq-XTf0WKCv8cG32_MhcJpO9Sg&export=download',
    'es': 'https://drive.google.com/uc?id=1tUe5jFHbPUF0IG7vnVo1rv9ARXRMFDoj&export=download',
    'ym': 'https://drive.google.com/uc?id=1CWh3hLNnZRjkfThbLRCqJphZQqtjEKoI&export=download'
};

export const hardenedClean = (raw: string): string => {
  if (!raw) return "";
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, ""); 
  
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return text;
  text = text.substring(firstBrace, lastBrace + 1);
  return text.replace(/\n/g, " ").trim();
};

export const salvageIntel = (raw: string): Partial<DecodedOutput> => {
  const salvaged: any = {
    bias: "NEUTRAL",
    confidence: "0%",
    one_liner: "Decoding market stream...",
    day_type_reasoning: []
  };
  
  try {
    const biasMatch = raw.match(/"bias"\s*:\s*"(.*?)"/i);
    if (biasMatch) salvaged.bias = biasMatch[1].trim().toUpperCase();
    const narrativeMatch = raw.match(/"(?:one_liner|narrative|summary)"\s*:\s*"(.*?)"/i);
    if (narrativeMatch) salvaged.one_liner = narrativeMatch[1].trim();
    const reasonMatch = raw.match(/"(?:day_type_reasoning|evidence|reasoning)"\s*:\s*\[([\s\S]*?)\]/i);
    if (reasonMatch) {
      const items = reasonMatch[1].match(/"(.*?)"/g);
      if (items) salvaged.day_type_reasoning = items.map(i => i.replace(/"/g, ''));
    }
    const confMatch = raw.match(/"confidence"\s*:\s*"(.*?)"/i);
    if (confMatch) salvaged.confidence = confMatch[1].trim();
  } catch (e) {
    console.warn("Salvage failed");
  }
  return salvaged;
};

export const parseCSV = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) return [];
      const dataRows = lines.slice(1);
      const dailyMap = new Map();
      
      dataRows.forEach(row => {
          const cols = row.split(',');
          if (cols.length < 5) return;
          const datePart = cols[0].split(' ')[0];
          const open = parseFloat(cols[2]);
          const high = parseFloat(cols[3]);
          const low = parseFloat(cols[4]);
          const close = parseFloat(cols[5]);
          const vol = parseFloat(cols[6]);
          if (isNaN(close)) return;

          if (!dailyMap.has(datePart)) {
              dailyMap.set(datePart, { date: datePart, open, high, low, close, volume: vol });
          } else {
              const existing = dailyMap.get(datePart);
              existing.high = Math.max(existing.high, high);
              existing.low = Math.min(existing.low, low);
              existing.close = close; 
              existing.volume += vol;
          }
      });
      return Array.from(dailyMap.values()).sort((a:any, b:any) => a.date.localeCompare(b.date));
    } catch (e) { return []; }
};

export const fetchAndParse = async (originalUrl: string) => {
    try {
        const urlWithConfirm = originalUrl + '&confirm=t';
        const proxyOptions = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlWithConfirm)}`,
            `https://corsproxy.io/?${encodeURIComponent(urlWithConfirm)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`
        ];
        for (const proxyUrl of proxyOptions) {
            try {
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    const content = await res.text();
                    if (!content.trim().startsWith('<!DOCTYPE') && content.length > 100) {
                        return parseCSV(content);
                    }
                }
            } catch (e) { continue; }
        }
        return [];
    } catch (e) { return []; }
};
