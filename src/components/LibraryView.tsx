import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronRight, X, Heart, ListMusic, Music, MoreVertical, 
  Play, Trash2, Plus, Disc, Star, Check, Sparkles, FolderHeart
} from 'lucide-react';
import { Track, Artist, Album } from '../constants';
import { libraryRepository } from '../application';
import { sqliteService } from '../services/sqliteService';
import { cn } from '../lib/utils';

interface LibraryViewProps {
  onTrackSelect: (track: Track) => void;
  onArtistSelect: (artistId: string) => void;
  onAlbumSelect: (albumId: string) => void;
  onNavigateToStudy: () => void;
  recentTracks: Track[];
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onTrackSelect,
  onArtistSelect,
  onAlbumSelect,
  onNavigateToStudy,
  recentTracks,
}) => {
  // Library States
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'tracks' | 'playlists' | 'artists' | 'albums'>('all');
  
  // Playlist creation state
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // Track context actions menu state
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  
  // Search state & details inside a playlist
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);

  // Load initial data
  const loadData = async () => {
    try {
      const favs = await libraryRepository.getFavorites();
      const favArtists = await libraryRepository.getFavoriteArtists();
      const favAlbums = await libraryRepository.getFavoriteAlbums();
      const lists = await libraryRepository.getPlaylists();
      setFavorites(favs || []);
      setFavoriteArtists(favArtists || []);
      setFavoriteAlbums(favAlbums || []);
      setPlaylists(lists || []);
    } catch (err) {
      console.error("Failed to load library data:", err);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = sqliteService.subscribe((event) => {
      if (event === "initialized" || event === "favorites" || event === "playlists") {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle Favorite Toggle from Context Menu
  const handleToggleFavorite = async (track: Track) => {
    try {
      await libraryRepository.toggleFavorite(track);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Check if a track is favorited
  const isTrackFavorite = (trackId: string) => {
    return favorites.some(t => {
      const tid = t.id || t.trackId;
      return tid === trackId;
    });
  };

  // Add Track to Playlist
  const handleAddTrackToPlaylist = async (playlistId: string, track: Track) => {
    try {
      await libraryRepository.addTrackToPlaylist(playlistId, track);
      await loadData();
      setIsAddToPlaylistOpen(false);
      setMenuTrack(null);
    } catch (err) {
      console.error("Could not add track:", err);
    }
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    try {
      await libraryRepository.removeTrackFromPlaylist(playlistId, trackId);
      await loadData();
      // Update local playlist state if open
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        const updatedLists = await libraryRepository.getPlaylists();
        const currentOpen = updatedLists.find(p => p.id === playlistId);
        setSelectedPlaylist(currentOpen || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Playlist
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const newId = await libraryRepository.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await libraryRepository.deletePlaylist(playlistId);
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter content by search query
  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    const query = searchQuery.toLowerCase();
    return favorites.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.artist.toLowerCase().includes(query) ||
      (t.album && t.album.toLowerCase().includes(query))
    );
  }, [favorites, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(p => p.name.toLowerCase().includes(query));
  }, [playlists, searchQuery]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return favoriteArtists;
    const query = searchQuery.toLowerCase();
    return favoriteArtists.filter(a => a.name.toLowerCase().includes(query));
  }, [favoriteArtists, searchQuery]);

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return favoriteAlbums;
    const query = searchQuery.toLowerCase();
    return favoriteAlbums.filter(a => 
      a.title.toLowerCase().includes(query) || 
      a.artist.toLowerCase().includes(query)
    );
  }, [favoriteAlbums, searchQuery]);

  // Generate collage cover for a playlist
  const renderPlaylistCover = (playlist: any) => {
    const listTracks = playlist.tracks || [];
    if (listTracks.length === 0) {
      return (
        <div className="w-16 h-16 rounded-2xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30">
          <Disc size={28} className="animate-spin-slow opacity-40 text-app-accent" style={{ animationDuration: '8s' }} />
        </div>
      );
    }
    if (listTracks.length < 4) {
      return listTracks[0].coverUrl ? (
        <img 
          src={listTracks[0].coverUrl} 
          alt={playlist.name} 
          className="w-16 h-16 rounded-2xl object-cover shadow-md border border-app-card-border"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30">
          <Disc size={28} />
        </div>
      );
    }
    // Render 2x2 grid collage
    return (
      <div className="w-16 h-16 rounded-2xl overflow-hidden grid grid-cols-2 shadow-md border border-app-card-border">
        {listTracks.slice(0, 4).map((t: Track, idx: number) => 
          t.coverUrl ? (
            <img 
              key={idx} 
              src={t.coverUrl} 
              alt="" 
              className="w-8 h-8 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div key={idx} className="w-8 h-8 bg-app-fg/5 flex items-center justify-center text-app-fg/20">
              <Disc size={12} />
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 overflow-y-auto px-6 pt-6 pb-32 max-w-5xl mx-auto scrollbar-hide" id="cantolex-library-view-main">
      <AnimatePresence mode="wait">
        {!selectedPlaylist ? (
          <motion.div
            key="library-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header Title & Minimal Settings Indicator */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-app-fg tracking-tight">My Library</h1>
                <p className="text-xs text-app-muted">Your personal language learning library of songs</p>
              </div>
              <button 
                onClick={() => setIsCreatingPlaylist(true)} 
                className="w-10 h-10 rounded-full bg-app-accent/10 hover:bg-app-accent hover:text-white transition-all flex items-center justify-center text-app-accent font-bold"
                title="Create playlist"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Custom Search Box */}
            <div className="relative group">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-app-fg opacity-30 group-focus-within:text-app-accent transition-colors"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search favorites, playlists, artists..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-app-card border border-app-card-border text-sm outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/30 transition-all text-app-fg shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-app-muted hover:text-app-fg transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tabs Filter Row */}
            <div className="flex gap-2 items-center overflow-x-auto py-1 scrollbar-hide select-none -mx-2 px-2">
              {(['all', 'tracks', 'playlists', 'artists', 'albums'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all shrink-0 cursor-pointer",
                    activeFilter === filter
                      ? "bg-app-accent border-app-accent text-white shadow-sm font-black"
                      : "bg-app-card border-app-card-border text-app-muted hover:text-app-fg"
                  )}
                >
                  {filter === 'all' && 'All'}
                  {filter === 'tracks' && 'Songs'}
                  {filter === 'playlists' && 'Playlists'}
                  {filter === 'artists' && 'Artists'}
                  {filter === 'albums' && 'Albums'}
                </button>
              ))}
            </div>

            {/* Modal: New Playlist Form */}
            <AnimatePresence>
              {isCreatingPlaylist && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="p-5 rounded-3xl bg-app-card border border-app-card-border shadow-app-card"
                >
                  <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-app-muted">New Playlist</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCreatingPlaylist(false)}
                        className="text-app-muted hover:text-app-fg p-1 rounded-full"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Playlist name..."
                        autoFocus
                        className="flex-1 px-4 py-2.5 rounded-xl bg-app-bg border border-app-card-border text-sm outline-none focus:border-app-accent/50 text-app-fg"
                      />
                      <button 
                        type="submit" 
                        className="px-5 rounded-xl bg-app-accent text-white text-xs font-bold uppercase hover:bg-opacity-90 active:scale-95 transition-all"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Sections Wrapper with larger gap heights */}
            <div className="space-y-10 pt-4">
              {/* SECTION 1: SELECTED TRACKS (Favorites) */}
              {(activeFilter === 'all' || activeFilter === 'tracks') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-app-accent">
                      <Star size={16} fill="currentColor" />
                      <h2 className="text-sm font-black uppercase tracking-[0.15em] text-app-fg leading-none">Favorite Tracks</h2>
                    </div>
                    <span className="text-[10px] font-black text-app-muted uppercase bg-app-fg/5 px-2 py-1 rounded-lg">
                      {filteredFavorites.length}
                    </span>
                  </div>

                  {filteredFavorites.length > 0 ? (
                    <div className="space-y-2">
                      {filteredFavorites.map((track) => (
                        <div
                          key={`fav-${track.id}`}
                          onClick={() => onTrackSelect(track)}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-app-card border border-app-card-border shadow-sm active:scale-[0.99] transition-all hover:bg-opacity-80 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 overflow-hidden flex-1 select-none">
                            {track.coverUrl ? (
                              <img
                                src={track.coverUrl}
                                className="w-11 h-11 rounded-xl object-cover shadow"
                                alt={track.title}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30 shrink-0 animate-pulse">
                                <Disc size={18} />
                              </div>
                            )}
                            <div className="text-left overflow-hidden">
                              <span className="font-bold text-app-fg text-[14px] leading-tight block truncate group-hover:text-app-accent transition-colors">
                                {track.title}
                              </span>
                              <span className="text-xs text-app-muted truncate block mt-0.5">
                                {track.artist}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuTrack(track);
                              }}
                              className="p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all active:scale-90"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-app-card-border opacity-60 bg-app-card/20 text-xs text-app-muted">
                      {searchQuery ? "No tracks match your search" : "No favorite songs in your library yet. Add them from the track menu!"}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: PLAYLISTS SECTION (Moved up after Favorite Tracks) */}
              {(activeFilter === 'all' || activeFilter === 'playlists') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-app-fg opacity-80 leading-none">Playlists</h2>
                    <span className="text-[10px] font-black text-app-muted uppercase">
                      {filteredPlaylists.length}
                    </span>
                  </div>

                  {filteredPlaylists.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          onClick={() => setSelectedPlaylist(playlist)}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-app-card border border-app-card-border hover:border-app-accent/30 shadow-sm active:scale-[0.99] transition-all hover:bg-opacity-85 group cursor-pointer"
                        >
                          <div className="flex items-center gap-4 flex-1 overflow-hidden select-none">
                            {renderPlaylistCover(playlist)}
                            <div className="text-left overflow-hidden">
                              <span className="font-bold text-app-fg text-[14px] leading-tight block truncate group-hover:text-app-accent transition-colors">
                                {playlist.name}
                              </span>
                              <span className="text-xs text-app-muted block mt-0.5">
                                {playlist.tracks?.length || 0} songs • {playlist.tracks?.length > 0 ? `${playlist.tracks.length * 3} min` : "empty"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleDeletePlaylist(playlist.id)}
                              className="p-2 text-app-muted hover:text-red-500 rounded-full hover:bg-red-500/5 transition-all"
                              title="Delete playlist"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4 rounded-3xl border border-dashed border-app-card-border opacity-60 bg-app-card/20 text-xs text-app-muted flex flex-col items-center gap-3">
                      <Disc size={36} className="opacity-30 text-app-accent-hover" />
                      <span>You have no created playlists yet.</span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingPlaylist(true)}
                        className="px-4 py-2 border border-app-accent text-app-accent bg-app-accent/5 hover:bg-app-accent hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Create first playlist
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: FAVORITE ARTISTS */}
              {(activeFilter === 'all' || activeFilter === 'artists') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-app-fg opacity-80 leading-none">Favorite Artists</h2>
                    <span className="text-[10px] font-black text-app-muted uppercase">
                      {filteredArtists.length}
                    </span>
                  </div>

                  {filteredArtists.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide select-none -mx-4 px-4">
                      {filteredArtists.map((artist) => (
                        <button
                          key={`art-${artist.id}`}
                          onClick={() => artist.id && onArtistSelect(artist.id)}
                          className="flex flex-col items-center gap-2 group cursor-pointer transition-transform duration-200 active:scale-95 focus:outline-none shrink-0"
                          style={{ width: '100px' }}
                        >
                          <div className="relative w-20 h-20 rounded-full overflow-hidden border border-app-card-border shadow shadow-app-accent/5 group-hover:scale-105 group-hover:border-app-accent transition-all duration-300">
                            {artist.coverUrl && artist.coverUrl !== "" ? (
                              <img
                                src={artist.coverUrl}
                                className="w-full h-full object-cover"
                                alt={artist.name}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-app-fg/5 flex items-center justify-center text-app-accent">
                                <Music size={26} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-app-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-[11px] font-bold text-app-fg group-hover:text-app-accent text-center truncate w-full transition-colors leading-tight px-1">
                            {artist.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 rounded-2xl border border-dashed border-app-card-border opacity-60 bg-app-card/20 text-xs text-app-muted">
                      Artists will appear automatically from your favorite tracks!
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: FAVORITE ALBUMS */}
              {(activeFilter === 'all' || activeFilter === 'albums') && filteredAlbums.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black uppercase tracking-[0.15em] text-app-fg opacity-80 leading-none">Favorite Albums</h2>
                    <span className="text-[10px] font-black text-app-muted uppercase">
                      {filteredAlbums.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {filteredAlbums.map((album) => (
                      <button
                        key={`alb-${album.id}`}
                        onClick={() => album.id && onAlbumSelect(album.id)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-app-card/50 border border-app-card-border shadow-sm text-left group hover:bg-app-card active:scale-95 transition-all w-full overflow-hidden"
                      >
                        {album.coverUrl && album.coverUrl !== "" ? (
                          <img 
                            src={album.coverUrl} 
                            alt={album.title} 
                            className="w-11 h-11 rounded-xl object-cover shadow border border-app-card-border"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-app-fg/5 flex items-center justify-center text-app-fg/30">
                            <Disc size={18} />
                          </div>
                        )}
                        <div className="overflow-hidden flex-1 leading-tight select-none">
                          <span className="font-bold text-app-fg text-xs block truncate group-hover:text-app-accent transition-colors">
                            {album.title}
                          </span>
                          <span className="text-[10px] text-app-muted block truncate mt-0.5">
                            {album.artist}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* PLAYLIST INNER TARGET VIEW */
          <motion.div
            key="playlist-inner-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header / Back Action bar */}
            <div className="flex items-center justify-between pointer-events-auto">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-fg transition-colors"
              >
                <X size={15} />
                <span>Back to playlists</span>
              </button>

              <button
                onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/5 px-2.5 py-1 rounded-xl transition-all"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>

            {/* Playlist Title & Meta card */}
            <div className="flex items-center gap-4 p-5 rounded-3xl bg-app-card border border-app-card-border shadow">
              {renderPlaylistCover(selectedPlaylist)}
              <div className="overflow-hidden select-none">
                <span className="text-[9px] font-black text-app-accent uppercase tracking-widest block mb-1">PLAYLIST</span>
                <h1 className="text-xl font-bold text-app-fg leading-tight truncate">{selectedPlaylist.name}</h1>
                <p className="text-xs text-app-muted mt-1 leading-none">
                  Total: {selectedPlaylist.tracks?.length || 0} songs • {selectedPlaylist.tracks?.length > 0 ? `${selectedPlaylist.tracks.length * 3} minutes track length` : "no tracks"}
                </p>
              </div>
            </div>

            {/* Tracks listing */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-app-muted uppercase tracking-widest leading-none block px-1">Tracks in Playlist</span>
              
              {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 ? (
                selectedPlaylist.tracks.map((track: Track, idx: number) => (
                  <div
                    key={`plt-${track.id}-${idx}`}
                    onClick={() => onTrackSelect(track)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-app-card/65 border border-app-card-border hover:border-app-accent/20 hover:bg-app-card transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 select-none">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          className="w-10 h-10 rounded-xl object-cover shadow border border-app-card-border"
                          alt={track.title}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30 shrink-0">
                          <Disc size={16} />
                        </div>
                      )}
                      <div className="text-left overflow-hidden">
                        <span className="font-bold text-app-fg text-sm block truncate group-hover:text-app-accent transition-colors">
                          {track.title}
                        </span>
                        <span className="text-xs text-app-muted truncate block mt-0.5">
                          {track.artist}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrackFromPlaylist(selectedPlaylist.id, track.id || track.trackId)}
                        className="p-2 text-app-muted hover:text-red-500 hover:bg-red-500/5 rounded-full transition-all"
                        title="Remove from playlist"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuTrack(track)}
                        className="p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-app-card-border opacity-50 bg-app-card/10 text-xs text-app-muted flex flex-col items-center gap-2">
                  <Music size={30} className="text-app-accent opacity-30" />
                  <span>No songs in this playlist yet.</span>
                  <span className="opacity-60 text-[10px]">Add songs from the home tab or search, using the three-dot menu!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRACK OVERFLOW CONTEXT POPUP DRAWER (Floating capsule) */}
      <AnimatePresence>
        {menuTrack && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-12">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setMenuTrack(null);
                setIsAddToPlaylistOpen(false);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Container drawer */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 210 }}
              className="relative w-full sm:max-w-md bg-app-card/95 backdrop-blur-3xl border border-app-card-border p-6 rounded-t-[2.5rem] sm:rounded-[2.2rem] shadow-2xl flex flex-col z-10 text-center text-app-fg max-h-[85vh] overflow-hidden"
            >
              {/* Top Drag/Close notch */}
              <div className="w-12 h-1 bg-app-fg/10 rounded-full mx-auto mb-5 sm:hidden" />

              {/* Close Button on Desktop */}
              <button
                onClick={() => {
                  setMenuTrack(null);
                  setIsAddToPlaylistOpen(false);
                }}
                className="absolute top-4 right-4 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-app-fg/5 hover:bg-app-fg/10 hover:scale-105 transition-all text-app-fg/60"
              >
                <X size={15} />
              </button>

              {/* Track summary */}
              <div className="flex items-center gap-4 text-left p-3.5 bg-app-fg/5 rounded-2xl mb-5 border border-app-card-border/60">
                {menuTrack.coverUrl ? (
                  <img
                    src={menuTrack.coverUrl}
                    alt={menuTrack.title}
                    className="w-14 h-14 rounded-xl object-cover shadow shadow-black/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30 shrink-0">
                    <Disc size={20} />
                  </div>
                )}
                <div className="overflow-hidden flex-1 select-none">
                  <h3 className="font-bold text-app-fg leading-tight truncate">{menuTrack.title}</h3>
                  <p className="text-xs text-app-muted truncate mt-0.5">{menuTrack.artist}</p>
                </div>
              </div>

              {!isAddToPlaylistOpen ? (
                /* MAIN MENU ACTIONS */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onTrackSelect(menuTrack)}
                    className="w-full py-3.5 px-4 bg-app-accent hover:bg-opacity-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Open / Study Song</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(menuTrack)}
                    className="w-full py-3.5 px-4 bg-app-card border border-app-card-border hover:bg-app-fg/5 text-app-fg font-extrabold rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Heart 
                        size={16} 
                        className={cn(isTrackFavorite(menuTrack.id || menuTrack.trackId) ? "text-app-accent fill-app-accent" : "text-app-fg opacity-40")} 
                      />
                      <span>
                        {isTrackFavorite(menuTrack.id || menuTrack.trackId) ? "Remove from Favorites" : "Add to Favorites"}
                      </span>
                    </div>
                    {isTrackFavorite(menuTrack.id || menuTrack.trackId) && (
                      <span className="text-[10px] font-black uppercase text-app-accent tracking-wider bg-app-accent/10 px-2 py-0.5 rounded">In Favorites</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddToPlaylistOpen(true)}
                    className="w-full py-3.5 px-4 bg-app-card border border-app-card-border hover:bg-app-fg/5 text-app-fg font-extrabold rounded-2xl flex items-center gap-2 transition-all"
                  >
                    <ListMusic size={16} className="text-app-fg opacity-40" />
                    <span>Add to playlist...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuTrack(null);
                      setIsAddToPlaylistOpen(false);
                    }}
                    className="w-full py-3 px-4 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-fg mt-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* PLAYLIST SELECTION */
                <div className="flex flex-col gap-3 min-h-[220px] max-h-[350px]">
                  <div className="flex items-center justify-between pb-2 border-b border-app-card-border">
                    <button
                      type="button"
                      onClick={() => setIsAddToPlaylistOpen(false)}
                      className="text-xs font-black text-app-accent uppercase tracking-wider flex items-center gap-1"
                    >
                      <span>Back</span>
                    </button>
                    <span className="text-xs font-black text-app-fg uppercase tracking-wider">Select playlist</span>
                    <div className="w-10 h-2" />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 md:space-y-2">
                    {playlists.length > 0 ? (
                      playlists.map((playlist) => {
                        const hasTrack = (playlist.trackIds || []).includes(menuTrack.id || menuTrack.trackId);
                        return (
                          <button
                            key={playlist.id}
                            type="button"
                            disabled={hasTrack}
                            onClick={() => handleAddTrackToPlaylist(playlist.id, menuTrack)}
                            className={cn(
                              "w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all",
                              hasTrack 
                                ? "bg-green-500/5 text-green-500/80 border-green-500/10 cursor-not-allowed" 
                                : "bg-app-card/40 border-app-card-border hover:bg-app-fg/5 text-app-fg hover:border-app-accent/25"
                            )}
                          >
                            <span className="font-bold text-sm block truncate pr-3">{playlist.name}</span>
                            {hasTrack ? (
                              <div className="flex items-center gap-1 shrink-0 text-green-500 font-bold text-xs uppercase tracking-wider">
                                <Check size={14} strokeWidth={2.5} />
                                <span>Added</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-app-muted shrink-0 font-bold uppercase">{playlist.tracks?.length || 0} songs</span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-app-muted">
                        No playlists yet. Go back and create a new playlist first!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
