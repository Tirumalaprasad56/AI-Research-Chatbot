import os

from dotenv import load_dotenv

from groq import Groq



# =====================================
# LOAD ENVIRONMENT VARIABLES
# =====================================

load_dotenv()



API_KEY = os.getenv(
    "GROQ_API_KEY"
)



if not API_KEY:

    raise ValueError(
        "GROQ_API_KEY missing in .env file"
    )





# =====================================
# GROQ CLIENT
# =====================================


client = Groq(

    api_key=API_KEY

)





# =====================================
# AI CHAT FUNCTION
# =====================================


def ask_ai(message, context=None):


    if not message or message.strip()=="":


        return "Please enter a valid question."




    system_prompt = """

You are an advanced AI Research Assistant.

Your responsibilities:

- Answer only research, technology,
  academic and project-related questions.

- Explain concepts clearly.

- Provide structured answers
  using headings and bullet points.

- Help with:
    * Literature surveys
    * Research papers
    * AI/ML concepts
    * Project ideas
    * Methodologies
    * Technical documentation

- If the question is unrelated,
  politely guide the user back
  to research topics.

"""



    messages=[


        {

            "role":"system",

            "content":system_prompt

        },


        {

            "role":"user",

            "content":message

        }


    ]



    # Add previous context if available

    if context:


        messages.insert(

            1,

            {

                "role":"assistant",

                "content":context

            }

        )




    try:


        response = client.chat.completions.create(


            model=
            "llama-3.3-70b-versatile",



            messages=messages,



            temperature=0.4,



            max_tokens=2000


        )



        answer = (

            response

            .choices[0]

            .message

            .content

        )



        return answer





    except Exception as e:



        print(
            "Groq Chat Error:",
            str(e)
        )



        return f"""

Unable to generate response.

Error:

{str(e)}

"""
def ask_document(document, question):

    prompt = f"""
You are an expert research assistant.

Answer ONLY using the uploaded document.

If the answer is not in the document, say:

'I couldn't find that information in the uploaded document.'

Document:

{document}

Question:

{question}
"""

    response = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.3,
        max_tokens=1200
    )

    return response.choices[0].message.content