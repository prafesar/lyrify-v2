import { useState, useEffect, useRef, useCallback } from "react";
import { type Track } from "../constants";
import { type Artist, type Album } from "../constants";
import { 
  userDataRepository, 
  aiClient 
} from "../application";
import { 
  searchITunes, 
  getArtistDetails, 
  getAlbumDetails 
} from "../services/musicService";

export interface UseLibrarySearchResult {
  searchQuery: string;
  searchEntityType: "musicTrack" | "album" | "musicArtist";
  searchResults: any[];
  artistDetails: { artist: Artist; albums: Album[]; topTracks: Track[] } | null;
  albumDetails: { album: Album; tracks: Track[] } | null;
  isSearchingDetails: boolean;
  recentTracks: Track[];
  searchHistory: string[];
  isSearchInputFocused: boolean;
  isSearching: boolean;
  dynamicTracks: Track[];
  isLoadingTracks: boolean;
  
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchEntityType: React.Dispatch<React.SetStateAction<"musicTrack" | "album" | "musicArtist">>;
  setIsSearchInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  setSearchHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setRecentTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setArtistDetails: React.Dispatch<React.SetStateAction<{ artist: Artist; albums: Album[]; topTracks: Track[] } | null>>;
  setAlbumDetails: React.Dispatch<React.SetStateAction<{ album: Album; tracks: Track[] } | null>>;
  
  handleSearch: (e?: React.FormEvent, overrideQuery?: string) => Promise<void>;
  handleArtistSelect: (artistId: string) => Promise<void>;
  handleAlbumSelect: (albumId: string) => Promise<void>;
  cancelSearchDetails: () => void;
  loadCommunityTracks: () => Promise<void>;
}

export function useLibrarySearch(targetLanguage: string): UseLibrarySearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchEntityType, setSearchEntityType] = useState<"musicTrack" | "album" | "musicArtist">("musicTrack");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [artistDetails, setArtistDetails] = useState<{ artist: Artist; albums: Album[]; topTracks: Track[] } | null>(null);
  const [albumDetails, setAlbumDetails] = useState<{ album: Album; tracks: Track[] } | null>(null);
  const [isSearchingDetails, setIsSearchingDetails] = useState(false);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = userDataRepository.getPreference("lyrify_search_history", "[]");
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  });
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dynamicTracks, setDynamicTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Load recent tracks on mount
  useEffect(() => {
    try {
      const recent = userDataRepository.getRecentTracks();
      setRecentTracks(recent);
    } catch (e) {
      console.error("[useLibrarySearch] Failed to get recent tracks:", e);
      setRecentTracks([]);
    }
  }, []);

  const cancelSearchDetails = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearchingDetails(false);
    setIsSearching(false);
  }, []);

  const loadCommunityTracks = useCallback(async () => {
    setIsLoadingTracks(true);
    try {
      const dbTracks = await aiClient.getLatestAnalyzedTracks(24);
      const appTracks: Track[] = dbTracks.map((t: any) => {
        let artistName = "Unknown Artist";
        if (Array.isArray(t.artists) && t.artists.length > 0) {
          artistName = t.artists[0];
        } else if (typeof t.artists === "string") {
          artistName = t.artists;
        } else if (t.artist) {
          artistName = t.artist;
        }

        return {
          id: t.trackKey || String(Math.random()),
          title: t.title || "Unknown Title",
          artist: artistName,
          artistId: t.artistId || "",
          album: t.albumName || "Unknown Album",
          albumId: t.albumId || "",
          coverUrl: t.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop",
          audioUrl: t.audioUrl || "",
          appleMusicUrl: t.appleMusicUrl || "",
          sourceLanguage: t.originalLanguage || "English",
          difficulty: t.difficulty,
          promptVersion: t.promptVersion,
          meaning: (() => {
            const langKey = targetLanguage.toLowerCase().trim();
            if (langKey === "spanish") return t.meanings?.es || t.meanings?.en;
            if (langKey === "russian") return t.meanings?.ru || t.meanings?.en;
            if (langKey === "polish") return t.meanings?.pl || t.meanings?.en;
            return t.meanings?.en;
          })(),
          meanings: t.meanings,
          documentId: t.trackKey
        };
      });
      setDynamicTracks(appTracks);
    } catch (err) {
      console.error("[useLibrarySearch] Error during loading/mapping:", err);
    } finally {
      setIsLoadingTracks(false);
    }
  }, [targetLanguage]);

  useEffect(() => {
    loadCommunityTracks();
  }, [loadCommunityTracks]);

  const handleSearch = useCallback(async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    if (!query.trim()) return;

    setSearchQuery(query);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setArtistDetails(null);
    setAlbumDetails(null);

    try {
      const results = await searchITunes(query, searchEntityType, controller.signal);
      setSearchResults(results);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    }

    const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    userDataRepository.setPreference("lyrify_search_history", JSON.stringify(newHistory));

    if (searchContainerRef.current) {
      searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [searchQuery, searchEntityType, searchHistory]);

  const handleArtistSelect = useCallback(async (artistId: string) => {
    if (!artistId || artistId === "undefined") return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingDetails(true);

    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsSearchingDetails(false);
    }, 15000);

    try {
      const details = await getArtistDetails(artistId, controller.signal);
      if (details && details.artist) {
        setArtistDetails(details);
        setAlbumDetails(null);
        if (searchContainerRef.current) {
          searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== "AbortError") {
        console.error("Failed to load artist details:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearchingDetails(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  const handleAlbumSelect = useCallback(async (albumId: string) => {
    if (!albumId || albumId === "undefined") return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingDetails(true);

    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsSearchingDetails(false);
    }, 15000);

    try {
      const details = await getAlbumDetails(albumId, controller.signal);
      if (details && details.album) {
        setAlbumDetails(details);
        setArtistDetails(null);
        if (searchContainerRef.current) {
          searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== "AbortError") {
        console.error("Failed to load album details:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearchingDetails(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Re-run search if searchEntityType changes and searchQuery is not blank
  useEffect(() => {
    if (searchQuery.trim() && !artistDetails && !albumDetails && searchResults.length > 0) {
      handleSearch();
    }
  }, [searchEntityType]);

  return {
    searchQuery,
    searchEntityType,
    searchResults,
    artistDetails,
    albumDetails,
    isSearchingDetails,
    recentTracks,
    searchHistory,
    isSearchInputFocused,
    isSearching,
    dynamicTracks,
    isLoadingTracks,
    searchContainerRef,
    setSearchQuery,
    setSearchEntityType,
    setIsSearchInputFocused,
    setSearchResults,
    setSearchHistory,
    setRecentTracks,
    setArtistDetails,
    setAlbumDetails,
    handleSearch,
    handleArtistSelect,
    handleAlbumSelect,
    cancelSearchDetails,
    loadCommunityTracks
  };
}
