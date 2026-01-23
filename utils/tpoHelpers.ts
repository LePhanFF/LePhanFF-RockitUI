
export interface TPORow {
    price: number;
    letters: string;
    volume: number;
}

export const generateTPOData = (history: any[], timeframe: '30m' | '5m', tickSize: number, ibLevels?: { high: number, low: number }) => {
    if (!history || history.length === 0) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

    const tpoMap = new Map<number, Set<string>>();
    const volumeMap = new Map<number, number>();
    
    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;

    // Sort history by time to ensure proper delta volume calculation
    const sortedHistory = [...history].sort((a, b) => 
       (a.input?.current_et_time || '').localeCompare(b.input?.current_et_time || '')
    );

    let previousCumulativeVol = 0;

    // Helper: Map time to TPO Letter
    const getLetter = (timeStr: string) => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const minutesFromOpen = (hh * 60 + mm) - (9 * 60 + 30); // relative to 9:30
      
      if (minutesFromOpen < 0) return 'P'; // Pre-market

      let periodIndex = 0;
      if (timeframe === '5m') {
         periodIndex = Math.floor(minutesFromOpen / 5);
      } else {
         periodIndex = Math.floor(minutesFromOpen / 30);
      }
      
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      return letters[periodIndex] || '?';
    };

    sortedHistory.forEach(snap => {
      const time = snap.input?.current_et_time;
      if (!time) return;
      
      const letter = getLetter(time);
      const ib = snap.input?.intraday?.ib;
      if (!ib) return;

      const p1 = ib.current_open;
      const p2 = ib.current_close;
      
      const rangeHigh = Math.max(p1, p2);
      const rangeLow = Math.min(p1, p2);

      // Expand Global Range
      if (rangeHigh > maxP) maxP = rangeHigh;
      if (rangeLow < minP) minP = rangeLow;

      // --- Volume Distribution ---
      const currentCumulativeVol = ib.current_volume || 0;
      const snapshotVol = Math.max(0, currentCumulativeVol - previousCumulativeVol);
      previousCumulativeVol = currentCumulativeVol;

      // Determine Buckets based on selected tickSize
      const startBucket = Math.floor(rangeLow / tickSize) * tickSize;
      const endBucket = Math.floor(rangeHigh / tickSize) * tickSize;
      
      const numBuckets = Math.round((endBucket - startBucket) / tickSize) + 1;
      const volPerBucket = numBuckets > 0 ? snapshotVol / numBuckets : 0;

      // Fill Buckets
      for (let p = startBucket; p <= endBucket + (tickSize/10); p += tickSize) {
        const bucketPrice = parseFloat(p.toFixed(2));
        
        if (!tpoMap.has(bucketPrice)) {
            tpoMap.set(bucketPrice, new Set());
        }
        tpoMap.get(bucketPrice)?.add(letter);

        const currentVol = volumeMap.get(bucketPrice) || 0;
        const newVol = currentVol + volPerBucket;
        volumeMap.set(bucketPrice, newVol);
        if (newVol > maxVol) maxVol = newVol;
      }
    });

    if (minP === Infinity) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

    if (ibLevels?.high) maxP = Math.max(maxP, ibLevels.high);
    if (ibLevels?.low) minP = Math.min(minP, ibLevels.low);

    minP = Math.floor(minP / tickSize) * tickSize;
    maxP = Math.ceil(maxP / tickSize) * tickSize;

    // Pad Range
    minP -= (tickSize * 2);
    maxP += (tickSize * 2);

    const rows: TPORow[] = [];
    for (let p = maxP; p >= minP; p -= tickSize) {
        const price = parseFloat(p.toFixed(2));
        const lettersSet = tpoMap.get(price);
        const letterStr = lettersSet ? Array.from(lettersSet).sort().join('') : '';
        const volume = volumeMap.get(price) || 0;
        
        rows.push({ price, letters: letterStr, volume });
    }

    return { tpoRows: rows, minPrice: minP, maxPrice: maxP, maxVolume: maxVol };
};