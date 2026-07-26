// =====================================
// ELEMENTS
// =====================================

const button = document.getElementById("generateBtn");
const report = document.getElementById("report");
const loading = document.getElementById("loading");
const copy = document.getElementById("copyBtn");
const search = document.getElementById("search");
const newChat = document.getElementById("newChat");

let currentDocument = null;


// =====================================
// GENERATE REPORT
// =====================================

if(button){

button.onclick = async () => {

    const topic = document.getElementById("topic").value.trim();

    if(topic===""){
        alert("Please enter a research topic.");
        return;
    }

    loading.style.display="block";
    report.innerHTML="";

    try{

        const response=await fetch("/generate",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                topic:topic
            })

        });

        const data=await response.json();

        loading.style.display="none";

        if(data.error){

            report.innerHTML=`
                <div class="alert alert-danger">
                    ${data.error}
                </div>
            `;

            return;
        }

        report.innerHTML=marked.parse(data.report);

        loadHistory();

        loadStats();

    }

    catch(err){

        loading.style.display="none";

        report.innerHTML=`
            <div class="alert alert-danger">
                ${err}
            </div>
        `;

    }

};

}


// =====================================
// COPY REPORT
// =====================================

if(copy){

copy.onclick=()=>{

    navigator.clipboard.writeText(report.innerText);

    copy.innerHTML="✅ Copied";

    setTimeout(()=>{

        copy.innerHTML="📋 Copy";

    },1500);

};

}


// =====================================
// LOAD REPORT HISTORY
// =====================================

async function loadHistory(){

    const response=await fetch("/history");

    const data=await response.json();

    const history=document.getElementById("history");

    history.innerHTML="";

    if(data.length===0){

        history.innerHTML=`
            <p class="text-center text-secondary">
                No reports yet
            </p>
        `;

        return;
    }

    data.forEach(item=>{

        history.innerHTML+=`

        <div class="history-item">

            <span onclick="openReport(${item.id})">

                ${item.favorite ? "⭐" : "📄"}

                ${item.topic}

            </span>

            <div>

                <button
                    class="btn btn-warning btn-sm me-1"
                    onclick="favoriteReport(${item.id})">

                    ⭐

                </button>

                <button
                    class="btn btn-danger btn-sm"
                    onclick="deleteReport(${item.id})">

                    🗑

                </button>

            </div>

        </div>

        `;

    });

}


// =====================================
// OPEN REPORT
// =====================================

async function openReport(id){

    const response=await fetch(`/report/${id}`);

    const data=await response.json();

    if(data.error){

        alert(data.error);

        return;

    }

    report.innerHTML=marked.parse(data.report);

}


// =====================================
// DELETE REPORT
// =====================================

async function deleteReport(id){

    if(!confirm("Delete this report?"))
        return;

    await fetch(`/delete/${id}`,{

        method:"DELETE"

    });

    report.innerHTML="";

    loadHistory();

    loadStats();

}


// =====================================
// FAVORITE REPORT
// =====================================

async function favoriteReport(id){

    await fetch(`/favorite/${id}`,{

        method:"POST"

    });

    loadHistory();

    loadStats();

}
// =====================================
// UPLOAD DOCUMENT
// =====================================

const uploadBtn = document.getElementById("uploadBtn");

if(uploadBtn){

    uploadBtn.onclick = async () => {

        const fileInput = document.getElementById("documentFile");

        if(fileInput.files.length===0){

            alert("Please choose a file.");

            return;

        }

        const formData = new FormData();

        formData.append("file", fileInput.files[0]);

        const response = await fetch("/upload",{

            method:"POST",

            body:formData

        });

        const data = await response.json();

        if(data.error){

            alert(data.error);

            return;

        }

        alert("Document uploaded successfully.");

        fileInput.value="";

        await loadDocuments();

    };

}


// =====================================
// LOAD DOCUMENTS
// =====================================

async function loadDocuments(){

    const list=document.getElementById("documentList");

    if(!list) return;

    const response=await fetch("/documents");

    const docs=await response.json();

    list.innerHTML="";

    if(docs.length===0){

        list.innerHTML=`
        <div class="text-center text-secondary p-4">
            No uploaded documents.
        </div>
        `;

        currentDocument=null;

        return;

    }

    docs.forEach(doc=>{
        if(currentDocument===null){

    currentDocument=doc.id;

    console.log("Default Document:",currentDocument);

}

        const row=document.createElement("div");

        row.className="history-item";

        row.innerHTML=`

            <span class="doc-name">

                📄 ${doc.filename}

            </span>

            <button class="btn btn-danger btn-sm">

                🗑

            </button>

        `;

        row.querySelector(".doc-name").addEventListener("click",()=>{

            openDocument(doc.id);

        });

        row.querySelector("button").addEventListener("click",()=>{

            deleteDocument(doc.id);

        });

        list.appendChild(row);

    });

}


// =====================================
// OPEN DOCUMENT
// =====================================

async function openDocument(id){

    currentDocument=id;

    console.log("Selected Document:",currentDocument);

    const response=await fetch(`/document/${id}`);

    const doc=await response.json();

    if(doc.error){

        alert(doc.error);

        return;

    }

    report.innerHTML=`
        <h3>${doc.filename}</h3>
        <hr>
        <pre>${doc.content}</pre>
    `;

}

// =====================================
// DELETE DOCUMENT
// =====================================

async function deleteDocument(id){

    if(!confirm("Delete this document?"))

        return;

    const response=await fetch(`/delete_document/${id}`,{

        method:"DELETE"

    });

    const data=await response.json();

    if(data.error){

        alert(data.error);

        return;

    }

    if(currentDocument===id){

        currentDocument=null;

        report.innerHTML="";

        document.getElementById("documentAnswer").innerHTML="";

    }

    await loadDocuments();

}
// =====================================
// ASK AI ABOUT DOCUMENT
// =====================================

const askDocumentBtn = document.getElementById("askDocumentBtn");

if(askDocumentBtn){

    askDocumentBtn.onclick = async () => {

        if(currentDocument===null){

            alert("Please open a document first.");

            return;

        }

        const question=document
            .getElementById("documentQuestion")
            .value
            .trim();

        if(question===""){

            alert("Please enter a question.");

            return;

        }

        document.getElementById("documentAnswer").innerHTML=`
            <div class="alert alert-info">
                Thinking...
            </div>
        `;

        try{

            const response=await fetch("/ask_document",{

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    document_id:currentDocument,

                    question:question

                })

            });

            const data=await response.json();

            if(data.error){

                document.getElementById("documentAnswer").innerHTML=`
                    <div class="alert alert-danger">
                        ${data.error}
                    </div>
                `;

                return;

            }

            document.getElementById("documentAnswer").innerHTML=`
                <div class="alert alert-success">
                    ${data.answer}
                </div>
            `;

        }

        catch(err){

            document.getElementById("documentAnswer").innerHTML=`
                <div class="alert alert-danger">
                    ${err}
                </div>
            `;

        }

    };

}


// =====================================
// EXPORT PDF
// =====================================

document.getElementById("pdfBtn").onclick=async()=>{

    const text=report.innerText.trim();

    if(text===""){

        alert("No report available.");

        return;

    }

    const response=await fetch("/export/pdf",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            report:text

        })

    });

    const blob=await response.blob();

    const url=window.URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="Research_Report.pdf";

    a.click();

};


// =====================================
// EXPORT WORD
// =====================================

document.getElementById("docBtn").onclick=async()=>{

    const text=report.innerText.trim();

    if(text===""){

        alert("No report available.");

        return;

    }

    const response=await fetch("/export/docx",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            report:text

        })

    });

    const blob=await response.blob();

    const url=window.URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="Research_Report.docx";

    a.click();

};


// =====================================
// DASHBOARD STATS
// =====================================

async function loadStats(){

    const response=await fetch("/stats");

    const stats=await response.json();

    document.getElementById("totalReports").innerHTML=stats.total;

    document.getElementById("todayReports").innerHTML=stats.today;

    document.getElementById("favoriteReports").innerHTML=stats.favorites;

}


// =====================================
// SEARCH HISTORY
// =====================================

if(search){

    search.addEventListener("keyup",function(){

        const value=this.value.toLowerCase();

        document.querySelectorAll(".history-item").forEach(item=>{

            item.style.display=

                item.innerText.toLowerCase().includes(value)

                ? "flex"

                : "none";

        });

    });

}


// =====================================
// NEW REPORT
// =====================================

if(newChat){

    newChat.onclick=()=>{

        document.getElementById("topic").value="";

        document.getElementById("documentQuestion").value="";

        document.getElementById("documentAnswer").innerHTML="";

        report.innerHTML="";

        currentDocument=null;

    };

}


// =====================================
// INITIAL LOAD
// =====================================

window.onload=()=>{

    loadHistory();

    loadStats();

    loadDocuments();

};
// =====================================
// AI PAPER ANALYZER
// =====================================

async function analyzeDocument(type){
    console.log("Analyze Function:", type);
    console.log("Current Document Before Analyze:",currentDocument);

if(currentDocument===null){

    const response=await fetch("/documents");

    const docs=await response.json();

    if(docs.length>0){

        currentDocument=docs[0].id;

        console.log("Recovered Document:",currentDocument);

    }

}

    if(currentDocument == null){

        alert("Open a document first.");

        return;

    }

    document.getElementById("analysisResult").innerHTML = `
        <div class="alert alert-info">
            AI is analyzing the document...
        </div>
    `;

    const response = await fetch("/analyze_document",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({

            type:type

        })

    });
    console.log("Response Status:", response.status);
    const data = await response.json();
    console.log(data);
    if(data.error){

        document.getElementById("analysisResult").innerHTML = `
            <div class="alert alert-danger">
                ${data.error}
            </div>
        `;

        return;

    }

    document.getElementById("analysisResult").innerHTML = `
        <div class="card shadow-sm mt-3">
            <div class="card-body">
                ${marked.parse(data.answer)}
            </div>
        </div>
    `;

}
// =====================================
// ANALYZER BUTTONS
// =====================================

// Summary
const summaryBtn = document.getElementById("summaryBtn");

if(summaryBtn){

    summaryBtn.onclick = () => {

        console.log("Summary Button Clicked");

        analyzeDocument("summary");

    };

}

// Keywords
const keywordsBtn = document.getElementById("keywordsBtn");

if(keywordsBtn){

    keywordsBtn.onclick = () => {

        console.log("Keywords Button Clicked");

        analyzeDocument("keywords");

    };

}

// Key Points
const pointsBtn = document.getElementById("pointsBtn");

if(pointsBtn){

    pointsBtn.onclick = () => {

        console.log("Points Button Clicked");

        analyzeDocument("points");

    };

}

// Abstract
const abstractBtn = document.getElementById("abstractBtn");

if(abstractBtn){

    abstractBtn.onclick = () => {

        console.log("Abstract Button Clicked");

        analyzeDocument("abstract");

    };

}

// Quiz
const quizBtn = document.getElementById("quizBtn");

if(quizBtn){

    quizBtn.onclick = () => {

        console.log("Quiz Button Clicked");

        analyzeDocument("quiz");

    };

}

// Interview Questions
const interviewBtn = document.getElementById("interviewBtn");

if(interviewBtn){

    interviewBtn.onclick = () => {

        console.log("Interview Button Clicked");

        analyzeDocument("interview");

    };

}

// Concepts
const conceptBtn = document.getElementById("conceptBtn");

if(conceptBtn){

    conceptBtn.onclick = () => {

        console.log("Concept Button Clicked");

        analyzeDocument("concepts");

    };

}
// =====================================
// GENERATE POWERPOINT
// =====================================

const generatePptBtn = document.getElementById("generatePptBtn");

if (generatePptBtn) {

    generatePptBtn.onclick = async () => {

        const topic = document
            .getElementById("pptTopic")
            .value
            .trim();

        if (topic === "") {

            alert("Please enter a presentation topic.");

            return;

        }

        generatePptBtn.disabled = true;

        generatePptBtn.innerHTML = `
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

                    topic: topic

                })

            });

            if (!response.ok) {

                alert("Failed to generate presentation.");

                return;

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

        }

        catch (err) {

            console.log(err);

            alert("Error generating presentation.");

        }

        finally {

            generatePptBtn.disabled = false;

            generatePptBtn.innerHTML = `
                <i class="bi bi-file-earmark-ppt-fill"></i>
                Generate PPT
            `;

        }

    };

}