import {createContext,useContext} from 'react';

/** Kept-mounted editors retain drafts while hidden host tabs and internal
 * utility pages suspend their floating surfaces. */
export const SurfaceActivity=createContext(true);
export const useSurfaceActivity=()=>useContext(SurfaceActivity);
