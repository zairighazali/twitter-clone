import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, storage } from "../../firebase";
import { jwtDecode } from "jwt-decode";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import context from "react-bootstrap/esm/AccordionContext";


// FETCH POSTS BY USER
export const fetchPostsByUser = createAsyncThunk(
  "posts/fetchByUser",
  async (userId) => {
    try {
      const postsRef = collection(db, `users/${userId}/posts`);

      const querySnapshot = await getDocs(postsRef);
      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return docs;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

// SAVE POST
export const savePost = createAsyncThunk(
  "posts/savePost",
  async ({ userId, postContent, file }) => {
    try {
      let imageUrl = "";
      console.log(file);
      if (file !== null) {
        const imageRef = ref(storage, `posts/${file.name}`); //sama macam posts/file name dalam folder.
        const response = await uploadBytes(imageRef, file); //uploadbytes tu upload file pcs by pcs
        imageUrl = await getDownloadURL(response.ref); // buat image tu proper url link
      }
      const postsRef = collection(db, `users/${userId}/posts`);
      const newPostRef = doc(postsRef);
      await setDoc(newPostRef, { content: postContent, likes: [], imageUrl });

      const newPost = await getDocs(newPostRef);
      const post = {
        id: newPost.id,
        ...newPost.data(),
      };
      return post;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

// UPDATE POSTS
export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async ({ userId, postId, newPostContent, newFile}) => { 
  try {
    let newImageURL
    if (newFile) {
      const imageRef = ref(storage, `posts/${newFile.name}`)
      const response = await uploadBytes(imageRef, newFile)
      newImageURL = await getDownloadURL(response.ref)
    }
    const postRef = doc(db, `users/${userId}/posts/${postId}`)
    const postSnap = await getDoc(postRef)
    if (postSnap.exists()){
      const postData = postSnap.data()

      const updatedData = {
        ...postData,
        content: newPostContent || postData.content,
        imageUrl: newImageURL || postData.imageUrl
      }
      await updateDoc(postRef, updatedData)
      const updatedPost = { id: postId, ...updatedData}
      return updatedPost
    } else {
      throw new Error('Post does not exist')
    }
  } catch (error){
    console.error(error)
    throw error
  }
}
)

// Delete Post
export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async ({ userId, postId }) => {
    try {
      const postRef = doc(db, `users/${userId}/posts/${postId}`)
      await deleteDoc(postRef)
      return postId
    } catch (error) {
      console.error(error)
      throw error
    }
  }
)

// SEARCH POSTS
export const searchPosts = createAsyncThunk(
  "posts/searchPosts",
  async (searchTerm, thunkAPI) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/posts/search?q=${searchTerm}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState: {
    posts: [],
    searchResults: [],
    loading: true,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // FETCH POSTS BY USER
      .addCase(fetchPostsByUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPostsByUser.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.loading = false;
      })
      .addCase(fetchPostsByUser.rejected, (state) => {
        state.loading = false;
      })

      // SAVE POST
      .addCase(savePost.fulfilled, (state, action) => {
        state.posts = [action.payload, ...state.posts];
      })

      // UPDATE POST
      .addCase(updatePost.fulfilled, (state, action) => {
        const updatedPost = action.payload
        const postIndex = state.posts.findIndex(
          (post) => post.id === updatedPost.id
        )
        if (postIndex !== -1) {
          state.posts[postIndex] = updatedPost
        }
      })

      // LIKE POST
      .addCase(likePost.fulfilled, (state, action) => {
        const { userId, postId } = action.payload;

        const postIndex = state.posts.findIndex((post) => post.id === postId);
        if (postIndex !== -1) {
          state.posts[postIndex].likes.push(userId);
        }
      })

      // REMOVE LIKE
      .addCase(removeLikeFromPost.fulfilled, (state, action) => {
        const { userId, postId } = action.payload;

        const postIndex = state.posts.findIndex((post) => post.id === postId);
        if (postIndex !== -1) {
          state.posts[postIndex].likes = state.posts[postIndex].likes.filter(
            (id) => id !== userId
          );
        }
      })

      // DELETE POST
      .addCase(deletePost.fulfilled, (state, action) => {
        const deletedPostId = action.payload

        state.posts = state.posts.filter((post) => post.id !== deletedPostId)
      })

      // SEARCH POSTS
      .addCase(searchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const likePost = createAsyncThunk(
  "posts/likePost",
  async ({ userId, postId }) => {
    try {
      const postRef = doc(db, `users/${userId}/posts/${postId}`);
      const docSnap = await getDocs(postRef);

      if (docSnap.exists()) {
        const postData = docSnap.data();
        const likes = [...postData.likes, userId];

        await setDoc(postRef, { ...postData, likes });
      }
      return { userId, postId };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

export const removeLikeFromPost = createAsyncThunk(
  "posts/removeLikeFromPost",
  async ({ userId, postId }) => {
    try {
      const postRef = doc(db, `users/${userId}/posts/${postId}`);
      const docSnap = await getDocs(postRef);

      if (docSnap.exists()) {
        const postData = docSnap.data();
        const likes = postData.likes.filter((id) => id !== userId);

        await setDoc(postRef, { ...postData, likes });
      }
      return { userId, postId };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

export default postsSlice.reducer;
