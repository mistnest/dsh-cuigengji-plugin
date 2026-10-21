import type {DependencyList, Dispatch, SetStateAction} from 'react';
import {usePreference, useResource} from './state.js';

export type FeatureCall = (action: string, args?: Record<string, unknown>) => Promise<any>;
export type FeatureRun = (work: () => Promise<unknown>) => Promise<boolean | undefined>;
export interface FeatureServices {call: FeatureCall; novelId: string; tick: number; run: FeatureRun; busy: boolean}
export interface Resource<T> {value: T | null; loading: boolean; error: string; retry: () => void; reload: () => Promise<T>}

/** Typed bridge for feature controllers; storage keys remain compatible with older UI. */
export function useWorkspacePreference<T>(name: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  return usePreference(name, fallback) as [T, Dispatch<SetStateAction<T>>];
}
/** Identity marks the data boundary; polling ticks need not invalidate a write's readback. */
export function useWorkspaceResource<T>(loader: () => Promise<T>, deps: DependencyList, identity: DependencyList = deps): Resource<T> {
  return useResource(loader, deps, {stable:true,identity}) as Resource<T>;
}
