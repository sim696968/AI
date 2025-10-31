# Minimal vector memory example (FAISS + sentence-transformers)
from sentence_transformers import SentenceTransformer
import faiss, numpy as np
model = SentenceTransformer('all-MiniLM-L6-v2')
index = None
corpus = []
def add_doc(text, meta=None):
    global index, corpus
    emb = model.encode([text])
    if index is None:
        index = faiss.IndexFlatL2(emb.shape[1])
        index.add(np.array(emb))
    else:
        index.add(np.array(emb))
    corpus.append({'text':text,'meta':meta})
def search(query, k=3):
    q_emb = model.encode([query])
    D,I = index.search(np.array(q_emb), k)
    return [corpus[i] for i in I[0]]
