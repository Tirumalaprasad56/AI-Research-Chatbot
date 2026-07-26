// =====================================
// RESEARCH PAPERS
// =====================================

const uploadPaperBtn = document.getElementById("uploadPaperBtn");
const paperList = document.getElementById("paperList");

let currentPaper = null;


// =====================================
// UPLOAD PAPER
// =====================================

if(uploadPaperBtn){

uploadPaperBtn.onclick = async()=>{

    const fileInput=document.getElementById("paperFile");

    if(fileInput.files.length===0){

        alert("Please select a research paper.");

        return;

    }

    const formData=new FormData();

    formData.append("file",fileInput.files[0]);

    uploadPaperBtn.disabled=true;

    uploadPaperBtn.innerHTML=`
        <span class="spinner-border spinner-border-sm"></span>
        Uploading...
    `;

    try{

        const response=await fetch("/upload_paper",{

            method:"POST",

            body:formData

        });

        const data=await response.json();

        if(data.error){

            alert(data.error);

        }

        else{

            alert("Research paper uploaded successfully.");

            fileInput.value="";

            await loadPapers();

        }

    }

    catch(err){

        alert(err);

    }

    finally{

        uploadPaperBtn.disabled=false;

        uploadPaperBtn.innerHTML=`
            <i class="bi bi-upload"></i>
            Upload Paper
        `;

    }

};

}


// =====================================
// LOAD PAPERS
// =====================================

async function loadPapers(){

    if(!paperList) return;

    const response=await fetch("/documents");

    const papers=await response.json();

    paperList.innerHTML="";

    if(papers.length===0){

        paperList.innerHTML=`
            <div class="text-center text-secondary p-4">
                No research papers uploaded.
            </div>
        `;

        currentPaper=null;

        return;

    }

    papers.forEach(paper=>{

        if(currentPaper===null){

            currentPaper=paper.id;

        }

        const row=document.createElement("div");

        row.className="history-item";

        row.innerHTML=`

            <span class="paper-name">

                📄 ${paper.filename}

            </span>

            <button class="btn btn-danger btn-sm">

                🗑

            </button>

        `;

        row.querySelector(".paper-name").onclick=()=>{

            openPaper(paper.id);

        };

        row.querySelector("button").onclick=()=>{

            deletePaper(paper.id);

        };

        paperList.appendChild(row);

    });

}


// =====================================
// OPEN PAPER
// =====================================

async function openPaper(id){

    currentPaper=id;

    try{

        const response=await fetch(`/document/${id}`);

        const paper=await response.json();

        if(paper.error){

            alert(paper.error);

            return;

        }

        document.getElementById("paperPreview").innerHTML=`

            <div class="card shadow-sm">

                <div class="card-header">

                    <h5>

                        📄 ${paper.filename}

                    </h5>

                </div>

                <div class="card-body">

<pre style="white-space:pre-wrap;">${paper.content}</pre>

                </div>

            </div>

        `;

    }

    catch(err){

        alert("Unable to open paper.");

    }

}


// =====================================
// DELETE PAPER
// =====================================

async function deletePaper(id){

    if(!confirm("Delete this paper?"))

        return;

    const response=await fetch(`/delete_paper/${id}`,{

        method:"DELETE"

    });

    const data=await response.json();

    if(data.error){

        alert(data.error);

        return;

    }

    if(currentPaper===id){

        currentPaper=null;

        document.getElementById("paperPreview").innerHTML="";

        document.getElementById("paperAnswer").innerHTML="";

        document.getElementById("paperResult").innerHTML="";

    }

    await loadPapers();

}
// =====================================
// AI RESEARCH PAPER ANALYSIS
// =====================================

async function analyzePaper(type){

    if(currentPaper===null){

        const response=await fetch("/documents");

        const papers=await response.json();

        if(papers.length>0){

            currentPaper=papers[0].id;

        }

    }

    if(currentPaper===null){

        alert("Please upload or open a research paper first.");

        return;

    }

    const result=document.getElementById("paperResult");

    result.innerHTML=`
        <div class="alert alert-info">

            <span class="spinner-border spinner-border-sm me-2"></span>

            AI is analyzing the research paper...

        </div>
    `;

    try{

        const response=await fetch("/analyze_paper",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                paper_id:currentPaper,

                type:type

            })

        });

        const data=await response.json();

        if(data.error){

            result.innerHTML=`
                <div class="alert alert-danger">

                    ${data.error}

                </div>
            `;

            return;

        }

        result.innerHTML=`
            <div class="card shadow-sm">

                <div class="card-header bg-success text-white">

                    🤖 AI Research Analysis

                </div>

                <div class="card-body">

                    ${marked.parse(data.answer)}

                </div>

            </div>
        `;

    }

    catch(err){

        result.innerHTML=`
            <div class="alert alert-danger">

                ${err}

            </div>
        `;

    }

}


// =====================================
// ANALYSIS BUTTON EVENTS
// =====================================

// Novelty
const noveltyBtn=document.getElementById("noveltyBtn");

if(noveltyBtn){

    noveltyBtn.onclick=()=>{

        analyzePaper("novelty");

    };

}


// Research Gap
const gapBtn=document.getElementById("gapBtn");

if(gapBtn){

    gapBtn.onclick=()=>{

        analyzePaper("gap");

    };

}


// Methodology
const methodBtn=document.getElementById("methodBtn");

if(methodBtn){

    methodBtn.onclick=()=>{

        analyzePaper("methodology");

    };

}


// Future Work
const futureBtn=document.getElementById("futureBtn");

if(futureBtn){

    futureBtn.onclick=()=>{

        analyzePaper("future");

    };

}


// Limitations
const limitBtn=document.getElementById("limitBtn");

if(limitBtn){

    limitBtn.onclick=()=>{

        analyzePaper("limitations");

    };

}


// References
const referenceBtn=document.getElementById("referenceBtn");

if(referenceBtn){

    referenceBtn.onclick=()=>{

        analyzePaper("references");

    };

}


// =====================================
// INITIAL LOAD
// =====================================

window.addEventListener("DOMContentLoaded", async () => {

    try{

        await loadPapers();

    }

    catch(err){

        console.log("Unable to load papers.", err);

    }

});