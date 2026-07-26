// =====================================
// ELEMENTS
// =====================================

const chatMessages = document.getElementById("chatMessages");

const chatInput = document.getElementById("chatInput");

const sendBtn = document.getElementById("sendBtn");

const newChatBtn = document.getElementById("newChatBtn");

const chatHistory = document.getElementById("chatHistory");

const chatSearch = document.getElementById("chatSearch");

let conversations = [];

let currentConversation = [];


// =====================================
// ADD USER MESSAGE
// =====================================

function addUserMessage(message){

    chatMessages.innerHTML += `

        <div class="user-message">

            <div class="message-content">

                ${message}

            </div>

        </div>

    `;

    scrollBottom();

}


// =====================================
// ADD AI MESSAGE
// =====================================

function addAIMessage(message){

    chatMessages.innerHTML += `

        <div class="ai-message">

            <div class="message-content">

                ${marked.parse(message)}

            </div>

        </div>

    `;

    scrollBottom();

}


// =====================================
// TYPING INDICATOR
// =====================================

function showTyping(){

    chatMessages.innerHTML += `

        <div class="ai-message" id="typing">

            <div class="typing">

                <span></span>

                <span></span>

                <span></span>

            </div>

        </div>

    `;

    scrollBottom();

}

function hideTyping(){

    const typing=document.getElementById("typing");

    if(typing){

        typing.remove();

    }

}


// =====================================
// AUTO SCROLL
// =====================================

function scrollBottom(){

    chatMessages.scrollTop=

    chatMessages.scrollHeight;

}
// =====================================
// SEND MESSAGE
// =====================================

async function sendMessage(){

    const message = chatInput.value.trim();

    if(message===""){

        return;

    }

    addUserMessage(message);

    currentConversation.push({

        role:"user",

        content:message

    });

    chatInput.value="";

    showTyping();

    sendBtn.disabled=true;

    try{

       const response = await fetch("/ask",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                message:message

            })

        });

        const data = await response.json();

        hideTyping();

        if(data.error){

            addAIMessage("❌ " + data.error);

            return;

        }

        addAIMessage(data.answer);

        currentConversation.push({

            role:"assistant",

            content:data.answer

        });

        saveConversation(message);

    }

    catch(err){

        hideTyping();

        addAIMessage("❌ Unable to connect to the server.");

        console.log(err);

    }

    finally{

        sendBtn.disabled=false;

    }

}


// =====================================
// SAVE CONVERSATION
// =====================================

function saveConversation(title){

    if(currentConversation.length===0){

        return;

    }

    conversations.unshift({

        title:title.substring(0,30),

        messages:[...currentConversation]

    });

    loadHistory();

}


// =====================================
// LOAD HISTORY
// =====================================

function loadHistory(){

    chatHistory.innerHTML="";

    if(conversations.length===0){

        chatHistory.innerHTML=`
            <div class="text-secondary text-center">

                No conversations yet.

            </div>
        `;

        return;

    }

    conversations.forEach((chat,index)=>{

        chatHistory.innerHTML += `

            <div
                class="history-item"
                onclick="openConversation(${index})">

                <i class="bi bi-chat-left-text"></i>

                ${chat.title}

            </div>

        `;

    });

}
// =====================================
// OPEN CONVERSATION
// =====================================

function openConversation(index){

    const chat = conversations[index];

    if(!chat) return;

    currentConversation = [...chat.messages];

    chatMessages.innerHTML = "";

    chat.messages.forEach(msg=>{

        if(msg.role==="user"){

            addUserMessage(msg.content);

        }

        else{

            addAIMessage(msg.content);

        }

    });

}


// =====================================
// NEW CHAT
// =====================================

if(newChatBtn){

newChatBtn.onclick=()=>{

    currentConversation=[];

    chatMessages.innerHTML=`

        <div class="ai-message">

            <div class="message-content">

                👋 <strong>New Chat Started</strong>

                <br><br>

                Ask me anything about

                <ul>

                    <li>Research Papers</li>

                    <li>Document Analysis</li>

                    <li>AI Reports</li>

                    <li>Presentations</li>

                    <li>Programming</li>

                </ul>

            </div>

        </div>

    `;

    chatInput.value="";

};

}


// =====================================
// SEARCH CHAT HISTORY
// =====================================

if(chatSearch){

chatSearch.addEventListener("keyup",function(){

    const value=this.value.toLowerCase();

    document.querySelectorAll(".history-item").forEach(item=>{

        item.style.display=

        item.innerText.toLowerCase().includes(value)

        ? "block"

        : "none";

    });

});

}


// =====================================
// ENTER KEY SUPPORT
// =====================================

if(chatInput){

chatInput.addEventListener("keydown",function(event){

    if(event.key==="Enter" && !event.shiftKey){

        event.preventDefault();

        sendMessage();

    }

});

}
// =====================================
// SEND BUTTON EVENT
// =====================================

if(sendBtn){

    sendBtn.onclick=()=>{

        sendMessage();

    };

}


// =====================================
// AUTO FOCUS
// =====================================

function focusInput(){

    if(chatInput){

        chatInput.focus();

    }

}


// =====================================
// CLEAR CHAT
// =====================================

function clearChat(){

    chatMessages.innerHTML=`

        <div class="ai-message">

            <div class="message-content">

                👋 Hello!

                <br><br>

                I am your <strong>AI Research Assistant</strong>.

                <br><br>

                I can help you with:

                <ul>

                    <li>Research Reports</li>

                    <li>Research Papers</li>

                    <li>Document Analysis</li>

                    <li>Presentations</li>

                    <li>Programming Questions</li>

                    <li>AI & Machine Learning</li>

                </ul>

                Start by typing your question below.

            </div>

        </div>

    `;

}


// =====================================
// INITIAL LOAD
// =====================================

window.addEventListener("DOMContentLoaded",()=>{

    loadHistory();

    clearChat();

    focusInput();

});


// =====================================
// OPTIONAL AUTO SCROLL
// =====================================

const observer=new MutationObserver(()=>{

    scrollBottom();

});

observer.observe(chatMessages,{

    childList:true,

    subtree:true

});