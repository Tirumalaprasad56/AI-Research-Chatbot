// =====================================
// PRESENTATION GENERATOR
// =====================================

const generateBtn = document.getElementById("generatePresentationBtn");

if (generateBtn) {

    generateBtn.onclick = async () => {

        const topic = document
            .getElementById("pptTopic")
            .value
            .trim();

        const slides = document
            .getElementById("slideCount")
            .value;

        if (topic === "") {

            alert("Enter presentation topic.");

            return;

        }

        // Preview
        document.getElementById("pptStatus").innerHTML = `
            <div class="alert alert-info">
                Generating presentation...
            </div>
        `;

        document.getElementById("slidePreview").innerHTML = `
            <div class="card shadow-sm p-3 mt-3">
                <h4>${topic}</h4>

                <hr>

                <p><strong>Slides :</strong> ${slides}</p>

                <p>
                    AI is preparing your PowerPoint presentation.
                </p>
            </div>
        `;

        generateBtn.disabled = true;

        generateBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Generating...
        `;

        try {

            const response = await fetch("/generate_ppt", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    topic: topic,

                    slides: slides

                })

            });

            if (!response.ok) {

                throw new Error("Presentation generation failed.");

            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = url;

            a.download = "Research_Presentation.pptx";

            document.body.appendChild(a);

            a.click();

            a.remove();

            window.URL.revokeObjectURL(url);

            document.getElementById("pptStatus").innerHTML = `
                <div class="alert alert-success">
                    ✅ Presentation generated successfully.
                </div>
            `;

        }

        catch (err) {

            document.getElementById("pptStatus").innerHTML = `
                <div class="alert alert-danger">
                    ${err.message}
                </div>
            `;

        }

        finally {

            generateBtn.disabled = false;

            generateBtn.innerHTML = `
                <i class="bi bi-file-earmark-ppt-fill"></i>
                Generate Presentation
            `;

        }

    };

}