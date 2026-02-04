// File: client/src/redux/cartSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const newItem = {
        id: `${Date.now()}_${Math.random()}`, // Unique cart item ID
        ...action.payload,
        addedAt: new Date().toISOString(),
      }
      state.items.push(newItem)
      state.totalItems = state.items.length
      state.totalAmount = state.items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      )
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload)
      state.totalItems = state.items.length
      state.totalAmount = state.items.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      )
    },
    updateCartItem: (state, action) => {
      const { id, updates } = action.payload
      const itemIndex = state.items.findIndex((item) => item.id === id)
      if (itemIndex !== -1) {
        state.items[itemIndex] = { ...state.items[itemIndex], ...updates }
        state.totalAmount = state.items.reduce(
          (sum, item) => sum + (item.totalPrice || 0),
          0
        )
      }
    },
    clearCart: (state) => {
      state.items = []
      state.totalAmount = 0
      state.totalItems = 0
    },
  },
  extraReducers: (builder) => {
    // Clear cart when user logs out
    builder.addCase('user/logout', (state) => {
      state.items = []
      state.totalAmount = 0
      state.totalItems = 0
    })
  },
})

export const { addToCart, removeFromCart, updateCartItem, clearCart } =
  cartSlice.actions

export default cartSlice.reducer
