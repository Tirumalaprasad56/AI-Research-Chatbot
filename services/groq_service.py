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
        "GROQ_API_KEY not found in .env file"
    )




# =====================================
# GROQ CLIENT
# =====================================


client = Groq(

    api_key=API_KEY

)




# =====================================
# GENERATE RESEARCH REPORT
# =====================================


def generate_report(topic):


    if not topic or topic.strip()=="":


        return "Please provide a valid research topic."



    print("\n"+"="*60)

    print(
        "Research Topic:",
        topic
    )

    print("="*60)




    prompt=f"""

You are an expert AI Research Assistant.

Your task is to generate a professional
academic research report.


Research Topic:

{topic}



Generate the report in Markdown format.



Follow this structure strictly:



# Title


## Abstract

Provide a brief summary of the research topic.



## Introduction

Explain the problem,
importance,
and motivation behind this research.



## Background

Explain fundamental concepts,
technologies,
and previous approaches.



## Literature Survey

Discuss existing research papers,
methods,
and important findings.



## Existing System

Explain currently available solutions
and their limitations.



## Research Gap

Identify problems that are not solved
by existing approaches.



## Proposed System

Explain an improved solution
or research approach.



## Methodology

Explain the workflow step-by-step.



## Applications

Mention real-world applications.



## Advantages

List major benefits.



## Challenges and Limitations

Explain possible drawbacks.



## Future Scope

Discuss future improvements
and research opportunities.



## Conclusion

Provide a final summary.



## References

Provide at least 5 references
in APA citation format.



Rules:

- Use professional academic language.
- Do not generate fake statistics.
- Keep explanations detailed.
- Use headings and bullet points where required.
- Make it suitable for a final year project literature survey.

"""



    try:



        print("Sending request to Groq...")



        response = client.chat.completions.create(


            model=
            "llama-3.3-70b-versatile",



            messages=[


                {


                    "role":
                    "system",


                    "content":
                    "You are a professional research paper writer."

                },


                {


                    "role":
                    "user",


                    "content":
                    prompt

                }

            ],



            temperature=0.4,


            max_tokens=4000

        )



        report = (
            response
            .choices[0]
            .message
            .content
        )



        print("="*60)

        print("Report Generated Successfully")

        print("="*60)



        return report





    except Exception as e:



        print(
            "Groq Error:",
            str(e)
        )



        return f"""

# Error Generating Report


Something went wrong while generating
the research report.


Error:

{str(e)}

"""