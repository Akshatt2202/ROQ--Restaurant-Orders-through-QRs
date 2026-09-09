import { ICart, ICartItem } from "@/model/cart";
import { IMenu } from "@/types/menu"
import { CartContributor } from "@/types/tableSession"
import { ApiResponse } from "@/utils/api";
import { GET_CART, POST_ITEM_CART } from "@/utils/APIConstant";
import { getApi, postApi } from "@/utils/common";
import { createAsyncThunk, createSlice, Dispatch, PayloadAction } from "@reduxjs/toolkit"

export interface CheckOutItems extends IMenu {
  /** This customer's own quantity - the only line their +/- controls touch. */
  itemCount: number
  /** Everything the table is ordering for this item, across all members. */
  tableCount?: number
  contributors?: CartContributor[]
}

export const syncCartWithDB = createAsyncThunk(
  "checkout/syncCart",
  async ({ itemId, quantity }: { itemId: string, quantity: number }) => {
    const response = await postApi<ApiResponse<ICart>>({
      url: POST_ITEM_CART,
      values: { itemId, quantity }
    });
    if (response?.success) {
      return response?.data;
    }
    return null;
  }
);

export const syncCartToCheckOut = createAsyncThunk(
  "checkout/cart",
  async ({ dispatch }: { dispatch: Dispatch }) => {
    const response = await getApi<ApiResponse<CheckOutItems[]>>({
      url: GET_CART
    });
    if (response?.success) {
      dispatch(setCheckout(response?.data));
      return response?.data;
    }
    return null;
  }
)

/** A solo cart has no table count - my own quantity is the whole line. */
const tableCountOf = (item: CheckOutItems) => item.tableCount ?? item.itemCount

const syncMyContributor = (item: CheckOutItems, myCount: number) => {
  if (!item.contributors) return

  const mine = item.contributors.find(c => c.isMe)

  if (!mine) {
    if (myCount > 0) item.contributors.push({ name: "You", quantity: myCount, isMe: true })
    return
  }

  if (myCount <= 0) {
    item.contributors = item.contributors.filter(c => !c.isMe)
    return
  }

  mine.quantity = myCount
}

/**
 * Optimistic edit of this customer's own line. The table count has to move with
 * it, because that is the number the cart and the bill show - waiting for the
 * next poll would make the button feel dead for a couple of seconds.
 */
const applyMyDelta = (item: CheckOutItems, delta: number) => {
  const table = tableCountOf(item)

  item.itemCount = Math.max(0, item.itemCount + delta)
  item.tableCount = Math.max(0, table + delta)
  syncMyContributor(item, item.itemCount)
}

const initialState: CheckOutItems[] = [];

const checkOutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    addCheckOutItem: (state, action: PayloadAction<IMenu>) => {
      const item = state.find(i => i._id === action.payload._id)

      if (item) {
        applyMyDelta(item, 1)
      } else {
        state.push({
          ...action.payload,
          itemCount: 1,
          tableCount: 1,
          contributors: [{ name: "You", quantity: 1, isMe: true }],
        })
      }
    },

    /** Drops this customer's own line. The row stays if the table still wants it. */
    removeCheckItem: (state, action: PayloadAction<string>) => {
      const index = state.findIndex(i => String(i._id) === action.payload)
      if (index === -1) return

      const item = state[index]
      const tableLeft = tableCountOf(item) - item.itemCount

      if (tableLeft <= 0) {
        return state.filter((_, i) => i !== index)
      }

      item.tableCount = tableLeft
      item.itemCount = 0
      syncMyContributor(item, 0)
    },

    incrementCheckOutItem: (state, action: PayloadAction<string>) => {
      const item = state.find(i => String(i._id) === action.payload)
      if (item) applyMyDelta(item, 1)
    },

    decrementCheckOutItem: (state, action: PayloadAction<string>) => {
      const index = state.findIndex(i => String(i._id) === action.payload)
      if (index === -1) return

      const item = state[index]
      if (item.itemCount <= 0) return

      // Only leaves the cart once nobody at the table is ordering it any more.
      if (item.itemCount === 1 && tableCountOf(item) === 1) {
        return state.filter((_, i) => i !== index)
      }

      applyMyDelta(item, -1)
    },

    updateCheckOutQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const item = state.find(i => String(i._id) === action.payload.id)
      if (item) {
        item.quantity = action.payload.quantity
      }
    },

    clearCheckout: () => {
      return []
    },

    setCheckout: (_state, action: PayloadAction<CheckOutItems[]>) => {
      return action.payload
    },
  },
})

export const { addCheckOutItem, removeCheckItem, incrementCheckOutItem, decrementCheckOutItem, updateCheckOutQuantity, clearCheckout, setCheckout } = checkOutSlice.actions

export default checkOutSlice.reducer
