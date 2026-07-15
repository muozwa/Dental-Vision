let model;

// =========================
// LOAD MODEL
// =========================
async function loadModel() {
    try {
        model = await tmImage.load(
            "./model/model.json",
            "./model/metadata.json"
        );
        console.log("MODEL BERHASIL DIMUAT");
    } catch (error) {
        console.error("GAGAL LOAD MODEL");
        console.error(error);
    }
}

loadModel();

// =========================
// GEMINI API
// =========================
async function getGeminiAdvice(disease) {
    const apiKey = "ISI-API-KEY"; // Ganti dengan API Key Gemini Anda

    // Modifikasi prompt agar output Gemini berbentuk JSON terstruktur 
    // supaya gampang dipecah ke dalam card-card kecil.
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
            return null;
        }

        // Parsing teks JSON dari Gemini
        let rawText = data.candidates[0].content.parts[0].text.trim();
        // Bersihkan pembungkus markdown jika gemini bandel menyertakannya
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(rawText);

    } catch (error) {
        console.error(error);
        return null;
    }
}

// =========================
// PREDICT
// =========================
async function predict() {
    if (!model) {
        alert("Model belum selesai dimuat.");
        return;
    }

    const image = document.getElementById("preview");
    
    document.getElementById("result").innerHTML = `
        <h2 class="text-[#2563eb] text-2xl font-bold mb-[20px]">
            <i class="fa-solid fa-spinner animate-spin"></i> AI sedang menganalisis...
        </h2>
    `;

    const prediction = await model.predict(image);
    prediction.sort((a, b) => b.probability - a.probability);
    const best = prediction[0];

    // Ambil data terstruktur dari Gemini
    const info = await getGeminiAdvice(best.className);

    // Template default jika API Gemini error / limit
    const fallbackInfo = {
        penjelasan: "Gagal memuat penjelasan dari AI secara otomatis.",
        gejala: ["Nyeri saat mengunyah", "Gigi sensitif"],
        penanganan: ["Sikat gigi teratur", "Gunakan pasta gigi fluoride"],
        kapan_ke_dokter: "Segera lakukan pemeriksaan ke klinik gigi terdekat."
    };

    const dataAdvice = info || fallbackInfo;

    // Render ulang UI menggunakan layout Grid Tailwind CSS (2 Kolom)
    document.getElementById("result").innerHTML = `
        <h2 class="text-[#2563eb] text-2xl font-bold mb-2">🦷 Hasil Analisis</h2>
        
        <div class="flex items-center gap-4 my-3">
            <span class="inline-block px-5 py-2 rounded-full bg-[#2563eb] text-white font-bold uppercase text-sm tracking-wider">
                ${best.className}
            </span>
            <p class="text-gray-700 text-sm">
                <span class="text-[#2563eb] font-bold">Tingkat Keyakinan:</span> 
                ${(best.probability * 100).toFixed(2)}%
            </p>
        </div>

        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-6">
            <div class="h-full bg-[#22c55e]" style="width:${best.probability * 100}%"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="p-4 bg-slate-50 border-l-4 border-[#2563eb] rounded-r-xl shadow-sm">
                <h3 class="text-[#2563eb] font-bold text-sm mb-1">📘 Penjelasan</h3>
                <p class="text-xs text-gray-600 leading-relaxed">${dataAdvice.penjelasan}</p>
            </div>

            <div class="p-4 bg-slate-50 border-l-4 border-[#2563eb] rounded-r-xl shadow-sm">
                <h3 class="text-[#2563eb] font-bold text-sm mb-1">⚠️ Gejala Umum</h3>
                <ul class="list-disc pl-4 text-xs text-gray-600 space-y-0.5">
                    ${dataAdvice.gejala.map(g => `<li>${g}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-slate-50 border-l-4 border-[#2563eb] rounded-r-xl shadow-sm">
                <h3 class="text-[#2563eb] font-bold text-sm mb-1">🏠 Penanganan di Rumah</h3>
                <ul class="list-disc pl-4 text-xs text-gray-600 space-y-0.5">
                    ${dataAdvice.penanganan.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-slate-50 border-l-4 border-[#2563eb] rounded-r-xl shadow-sm">
                <h3 class="text-[#2563eb] font-bold text-sm mb-1">🏥 Kapan ke Dokter?</h3>
                <p class="text-xs text-gray-600 leading-relaxed">${dataAdvice.kapan_ke_dokter}</p>
            </div>
        </div>

        <div class="p-4 bg-[#fff4e5] text-[#b45309] rounded-xl text-xs leading-relaxed">
            <strong class="block mb-1">📌 Disclaimer</strong>
            Hasil ini merupakan skrining awal menggunakan Artificial Intelligence dan tidak menggantikan diagnosis dari dokter gigi resmi.
        </div>
    `;
}

// =========================
// UPLOAD IMAGE
// =========================
document.getElementById("imageUpload").addEventListener("change", function (e) {
    const reader = new FileReader();
    reader.onload = function () {
        document.getElementById("preview").src = reader.result;
    };
    reader.readAsDataURL(e.target.files[0]);
});