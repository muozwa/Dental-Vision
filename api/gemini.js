export default async function handler(req, res) {
    // Izinkan CORS agar frontend bisa mengakses API ini
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Mengambil API Key yang disimpan dengan aman di dashboard Vercel nanti
    const apiKey = process.env.GCP_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key belum dikonfigurasi di server.' });
    }

    const { disease } = req.body;

    const prompt = `
Kamu adalah dokter gigi virtual. Berikan analisis klinis singkat mengenai penyakit gigi: "${disease}".
Berikan respon WAJIB dan HANYA dalam format JSON mentah murni (tanpa markdown \`\`\`json) seperti struktur berikut:
{
  "penjelasan": "Deskripsi singkat karies gigi dalam maksimal 25 kata.",
  "gejala": ["Gejala 1", "Gejala 2", "Gejala 3"],
  "penanganan": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "kapan_ke_dokter": "Indikasi kapan harus segera ke dokter gigi dalam maksimal 25 kata."
}
`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok || !data.candidates) {
            return res.status(500).json({ error: 'Gagal mendapatkan respon dari Gemini AI' });
        }

        let rawText = data.candidates[0].content.parts[0].text.trim();
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "");
        
        return res.status(200).json(JSON.parse(rawText));

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}