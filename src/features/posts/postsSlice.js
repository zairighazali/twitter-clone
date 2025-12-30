import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const BASE_URL =
  "https://73c8ef9d-a9be-4ce9-a268-66b95e672935-00-3q70h0gwb5ovr.pike.replit.dev";

// =======================
// FETCH POSTS BY USER
// =======================
export const fetchPostsByUser = createAsyncThunk(
  "posts/fetchByUser",
  async (userId) => {
    const response = await fetch(`${BASE_URL}/posts/user/${userId}`);
    return response.json();
  }
);

// =======================
// SAVE POST
// =======================
export const savePost = createAsyncThunk(
  "posts/savePost",
  async (postContent) => {
    const token = localStorage.getItem("authToken");
    const decode = jwtDecode(token);
    const userId = decode.id;

    const data = {
      title: "Post Title",
      content: postContent,
      user_id: userId,
    };

    const response = await axios.post(`${BASE_URL}/posts`, data);
    return response.data;
  }
);

// =======================
// 🔍 SEARCH POSTS
// =======================
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
    searchResults: [], // 👈 TAMBAH
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

      // 🔍 SEARCH POSTS
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

export default postsSlice.reducer;
