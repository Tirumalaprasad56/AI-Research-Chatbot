from services.document_service import read_document

text = read_document("C:\\Users\\LENOVO\\Downloads\\block chain.pdf")

print(text[:1000])