
import { API_BASE_URL } from './dataHelpers';

interface JournalContent {
    daily_remarks: any;
    time_slice_remarks: Record<string, string>;
}

export const appendJournalEntry = async (
    date: string, 
    time: string, 
    suffixKey: string, 
    content: string
): Promise<void> => {
    if (!date || !time || !content) return;

    const fullKey = `${time}${suffixKey}`;
    const token = localStorage.getItem('rockit_token');
    
    try {
        console.log(`[JournalService] Appending to ${fullKey}...`);

        // 1. Fetch current journal to ensure we don't overwrite recent changes
        let currentData: JournalContent = { daily_remarks: {}, time_slice_remarks: {} };
        let existingTimestamp = "";

        try {
            const res = await fetch(`${API_BASE_URL}/journal/${date}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (res.ok) {
                const json = await res.json();
                // Handle nested vs flat structure
                const contentObj = json.content || json;
                currentData = {
                    daily_remarks: contentObj.daily_remarks || {},
                    time_slice_remarks: contentObj.time_slice_remarks || {}
                };
                existingTimestamp = json.updated_at;
            }
        } catch (e) {
            console.warn("[JournalService] Fetch failed, falling back to local/empty", e);
        }

        // 2. Additive Merge Logic
        const existingEntry = currentData.time_slice_remarks[fullKey] || "";
        const separator = existingEntry ? "\n\n--- [UPDATE] ---\n" : "";
        const newEntry = `${existingEntry}${separator}${content}`;

        const updatedData = {
            ...currentData,
            time_slice_remarks: {
                ...currentData.time_slice_remarks,
                [fullKey]: newEntry
            }
        };

        // 3. Save Back
        const apiPayload = {
            date: date,
            content: updatedData,
            // If backend supports optimistic locking, we'd send existingTimestamp here
        };

        const saveRes = await fetch(`${API_BASE_URL}/journal/${date}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiPayload)
        });

        if (!saveRes.ok) {
            throw new Error(`Save failed: ${saveRes.status}`);
        }

        // 4. Update Local Storage for redundancy
        const localPayload = {
            date,
            ...updatedData,
            updated_at: new Date().toISOString()
        };
        localStorage.setItem(`journal_${date}`, JSON.stringify(localPayload));

        // 5. Notify UI
        window.dispatchEvent(new CustomEvent('journal-updated', { 
            detail: { date, key: fullKey } 
        }));

        console.log(`[JournalService] Successfully saved to ${fullKey}`);

    } catch (err) {
        console.error("[JournalService] Error appending entry:", err);
    }
};
