import {
  ChromaClient,
  Collection,
  Documents,
  Metadatas,
  OpenAIEmbeddingFunction,
} from "chromadb";
import { collection_name } from "../constants";

let client = null as ChromaClient | null;
let collection = null as Collection | null;
try {
  client = new ChromaClient({
    path: process.env.RAILWAY_URL,
  });
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY as string,
  });
  if (client) {
    collection = await client.getOrCreateCollection({
      name: collection_name,
      embeddingFunction: embedder,
    });
  }
} catch (e) {
  console.log(e);
}

/*
Adds a cast to the ChromaDB collection

ids: fid to associate with the cast
cast: string of cast text to add to the collection
metadatas: Metadata object to add to the collection (profile pic, etc)

**note, metadatas is type any, its just an object of:

{
 fname: user?.fname,
 profile_pic: user?.pfp_url,
 fid: user?.fid
}

Returns boolean of success
*/

export const addEmbedding = async (
  ids: string,
  cast: string,
  metadatas: any
) => {
  if (!client || !collection) return false;
  try {
    const add = await collection.add({
      ids,
      documents: [cast],
      metadatas,
    });

    return add;
  } catch (e) {
    console.log(e);
    return false;
  }
};

/*
Removes a cast to the ChromaDB collection

ids: fid to associate with the cast

Returns boolean of success
*/
export const removeEmbedding = async (id: string) => {
  if (!client || !collection) return false;
  try {
    const remove = await collection.delete({
      ids: [id],
    });

    return remove;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const updateEmbedding = async (id, metadatas) => {
  if (!client || !collection) return false;
  try {
    const update = await collection.update({
      ids: [id],
      metadatas,
    });

    return update;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const chroma = client;
