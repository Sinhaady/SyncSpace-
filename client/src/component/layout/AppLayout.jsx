import { useEffect, useMemo, useState } from "react";
import {
  AudioConference,
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createInviteAPI,
  createRoomAPI,
  deleteMessageAPI,
  editMessageAPI,
  getLiveKitTokenAPI,
  getMessagesAPI,
  getRoomsAPI,
  getWorkspaceInvitesAPI,
  getWorkspaceByIdAPI,
  revokeInviteAPI,
} from "../../api/apis";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

const canManageRooms = (role) => ["owner", "admin"].includes(role);
const canSendMessage = (role) => ["owner", "admin", "member"].includes(role);
const canModerateMessages = (role) => ["owner", "admin"].includes(role);
const quickReactions = ["👍", "❤️", "😂"];
const channelTypes = [
  { value: "text", label: "Text", icon: "#" },
  { value: "audio", label: "Audio", icon: "A" },
  { value: "video", label: "Video", icon: "V" },
];

const getUserId = (user) => user?._id || user?.id;

const formatMessageTime = (date) =>
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const getMemberName = (member) =>
  member?.nickname || member?.user?.username || "Unknown member";

const getInviteLink = (code) => `${window.location.origin}/invite/${code}`;

const AppLayout = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  const [workspace, setWorkspace] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [messageActionError, setMessageActionError] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("text");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [joiningCall, setJoiningCall] = useState(false);
  const [callError, setCallError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [inviteForm, setInviteForm] = useState({
    assignedRole: "member",
    expiresInDays: "7",
    maxUses: "",
  });
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const currentMember = useMemo(() => {
    const userId = getUserId(user);
    return workspace?.members?.find(
      (member) => getUserId(member.user) === userId,
    );
  }, [user, workspace]);

  const userRole = currentMember?.role;
  const activeRoom = rooms.find((room) => room._id === activeRoomId);
  const roomsByType = useMemo(
    () =>
      channelTypes.map((type) => ({
        ...type,
        rooms: rooms.filter((room) => room.type === type.value),
      })),
    [rooms],
  );

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError("");

        const [workspaceRes, roomsRes] = await Promise.all([
          getWorkspaceByIdAPI(workspaceId),
          getRoomsAPI(workspaceId),
        ]);

        if (!active) return;

        const nextWorkspace = workspaceRes.data.workspace;
        const nextRooms = roomsRes.data.rooms || [];

        setWorkspace(nextWorkspace);
        setRooms(nextRooms);
        setActiveRoomId((currentRoomId) => currentRoomId || nextRooms[0]?._id);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Unable to load this workspace.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!socket || !workspaceId) return undefined;

    socket.emit("workspace:join", { workspaceId });

    return undefined;
  }, [socket, workspaceId]);

  useEffect(() => {
    if (!socket || !activeRoomId || !workspaceId) return undefined;

    socket.emit("room:join", { roomId: activeRoomId, workspaceId });

    return () => {
      socket.emit("room:leave", { roomId: activeRoomId });
    };
  }, [socket, activeRoomId, workspaceId]);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      if (!activeRoomId || activeRoom?.type !== "text") {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        const res = await getMessagesAPI(activeRoomId, workspaceId);
        if (active) setMessages(res.data.messages || []);
      } catch {
        if (active) setMessages([]);
      } finally {
        if (active) setMessagesLoading(false);
      }
    };

    loadMessages();

    return () => {
      active = false;
    };
  }, [activeRoom, activeRoomId, workspaceId]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewMessage = (message) => {
      setMessages((currentMessages) => {
        if (message.room !== activeRoomId) return currentMessages;
        if (currentMessages.some((item) => item._id === message._id)) {
          return currentMessages;
        }
        return [...currentMessages, message];
      });
    };

    const handleDeletedMessage = ({ messageId }) => {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message._id !== messageId),
      );
    };

    const handleEditedMessage = (updatedMessage) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message._id === updatedMessage._id ? updatedMessage : message,
        ),
      );
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message._id === messageId ? { ...message, reactions } : message,
        ),
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:edited", handleEditedMessage);
    socket.on("message:deleted", handleDeletedMessage);
    socket.on("message:reactionUpdated", handleReactionUpdated);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:edited", handleEditedMessage);
      socket.off("message:deleted", handleDeletedMessage);
      socket.off("message:reactionUpdated", handleReactionUpdated);
    };
  }, [socket, activeRoomId]);

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    const name = newRoomName.trim();

    if (!name) return;

    const res = await createRoomAPI(workspaceId, {
      name,
      type: newRoomType,
    });
    const room = res.data.room;

    setRooms((currentRooms) => [...currentRooms, room]);
    setActiveRoomId(room._id);
    setCallSession(null);
    setJoiningCall(false);
    setCallError("");
    setNewRoomName("");
    setNewRoomType("text");
    setShowRoomForm(false);
  };

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    setCallSession(null);
    setJoiningCall(false);
    setCallError("");
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    if (
      !socket ||
      !activeRoom ||
      activeRoom.type !== "text" ||
      !draft.trim() ||
      !canSendMessage(userRole)
    ) {
      return;
    }

    socket.emit("message:send", {
      roomId: activeRoom._id,
      workspaceId,
      content: draft,
    });
    setDraft("");
  };

  const startEditingMessage = (message) => {
    setEditingMessageId(message._id);
    setEditDraft(message.content || "");
    setMessageActionError("");
  };

  const cancelEditingMessage = () => {
    setEditingMessageId("");
    setEditDraft("");
    setMessageActionError("");
  };

  const handleEditMessage = async (event, messageId) => {
    event.preventDefault();

    if (!editDraft.trim()) return;

    try {
      setMessageActionError("");

      if (socket && activeRoom) {
        socket.emit("message:edit", {
          messageId,
          content: editDraft,
          roomId: activeRoom._id,
        });
      } else {
        const res = await editMessageAPI(messageId, editDraft);
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message._id === messageId ? res.data.message : message,
          ),
        );
      }

      cancelEditingMessage();
    } catch (err) {
      setMessageActionError(
        err.response?.data?.message || "Unable to edit message.",
      );
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      setMessageActionError("");

      if (socket && activeRoom) {
        socket.emit("message:delete", {
          messageId,
          roomId: activeRoom._id,
        });
      } else {
        await deleteMessageAPI(messageId, workspaceId);
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message._id !== messageId),
        );
      }
    } catch (err) {
      setMessageActionError(
        err.response?.data?.message || "Unable to delete message.",
      );
    }
  };

  const handleReactToMessage = (messageId, emoji) => {
    if (!socket || !activeRoom || activeRoom.type !== "text") return;

    socket.emit("message:react", {
      messageId,
      roomId: activeRoom._id,
      emoji,
    });
  };

  const canManageMessage = (message) =>
    getUserId(message.author) === getUserId(user) || canModerateMessages(userRole);

  const handleJoinCall = async () => {
    if (!activeRoom || activeRoom.type === "text") return;

    try {
      setJoiningCall(true);
      setCallError("");

      const res = await getLiveKitTokenAPI({
        roomId: activeRoom._id,
        workspaceId,
      });

      setCallSession({
        token: res.data.token,
        serverUrl: res.data.livekitUrl,
        roomType: res.data.roomType,
      });
    } catch (err) {
      setCallError(
        err.response?.data?.message || "Unable to connect to this channel.",
      );
    } finally {
      setJoiningCall(false);
    }
  };

  const loadInvites = async () => {
    try {
      setInvitesLoading(true);
      setInviteError("");

      const res = await getWorkspaceInvitesAPI(workspaceId);
      setInvites(res.data.invites || []);
    } catch (err) {
      setInviteError(
        err.response?.data?.message || "Unable to load invite links.",
      );
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleOpenInvites = () => {
    setInviteOpen(true);
    loadInvites();
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();

    try {
      setInviteCreating(true);
      setInviteError("");

      const payload = {
        assignedRole: inviteForm.assignedRole,
        expiresInDays: Number(inviteForm.expiresInDays) || 7,
      };

      if (inviteForm.maxUses.trim()) {
        payload.maxUses = Number(inviteForm.maxUses);
      }

      const res = await createInviteAPI(workspaceId, payload);
      setInvites((currentInvites) => [res.data.invite, ...currentInvites]);
      setCopiedCode(res.data.invite.code);
      await navigator.clipboard?.writeText(getInviteLink(res.data.invite.code));
    } catch (err) {
      setInviteError(
        err.response?.data?.message || "Unable to create invite link.",
      );
    } finally {
      setInviteCreating(false);
    }
  };

  const handleCopyInvite = async (code) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(code));
      setCopiedCode(code);
    } catch {
      setInviteError("Copy failed. Select the link manually.");
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      setInviteError("");
      await revokeInviteAPI(workspaceId, inviteId);
      setInvites((currentInvites) =>
        currentInvites.filter((invite) => invite._id !== inviteId),
      );
    } catch (err) {
      setInviteError(
        err.response?.data?.message || "Unable to revoke invite link.",
      );
    }
  };

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid h-screen grid-cols-[72px_240px_minmax(0,1fr)_240px] bg-discord-dark-3 text-discord-text-normal font-sans select-none overflow-hidden">
      {/* Leftmost Server Sidebar */}
      <aside className="flex flex-col items-center gap-2 bg-discord-dark-1 py-3 px-2 z-10 shadow-lg">
        {/* Home/Dashboard Icon */}
        <div className="relative group flex items-center justify-center w-full">
          {/* Discord left indicator pill */}
          <div className="absolute left-[-8px] w-2 bg-white rounded-r-full transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-50 group-hover:h-5" />
          <Link
            to="/dashboard"
            className="grid h-12 w-12 place-items-center rounded-[24px] bg-discord-dark-3 text-lg font-bold text-discord-blurple hover:text-white hover:bg-discord-blurple hover:rounded-[16px] transition-all duration-200"
            title="Dashboard"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </div>

        <div className="h-[2px] w-8 bg-discord-dark-4 my-1 rounded" />

        {/* Workspace Server Icon */}
        <div className="relative group flex items-center justify-center w-full">
          {/* Active status pill */}
          <div className="absolute left-[-8px] w-2 bg-white rounded-r-full h-10 transition-all duration-200 scale-y-100" />
          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-discord-blurple text-sm font-bold text-white shadow-md cursor-default">
            {workspace?.icon ? workspace.icon.slice(0, 2).toUpperCase() : getInitial(workspace?.name)}
          </div>
        </div>
      </aside>

      {/* Channel Sidebar & User Footer */}
      <aside className="flex min-h-0 flex-col bg-discord-dark-2 z-10 border-r border-discord-dark-1/20">
        <header className="border-b border-discord-dark-1/45 px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.24)] cursor-pointer hover:bg-discord-dark-4/20 transition-all">
          <h1 className="truncate text-base font-bold text-discord-text-header tracking-tight">
            {workspace?.name}
          </h1>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-discord-text-muted">
              Channels
            </h2>
            {canManageRooms(userRole) && (
              <button
                type="button"
                onClick={() => setShowRoomForm((value) => !value)}
                className="text-discord-text-muted hover:text-white transition text-base leading-none p-0.5"
                title="Create channel"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {showRoomForm && (
            <form
              onSubmit={handleCreateRoom}
              className="mb-4 space-y-2.5 rounded bg-discord-dark-5 p-2 border border-discord-dark-4/60 animate-fadeIn"
            >
              <input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="new-channel"
                className="w-full rounded-[4px] border border-discord-dark-4 bg-discord-dark-3 px-2 py-1.5 text-xs outline-none focus:border-discord-blurple"
              />
              <div className="grid grid-cols-3 gap-1">
                {channelTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewRoomType(type.value)}
                    className={`rounded-[3px] py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      newRoomType === type.value
                        ? "bg-discord-blurple text-white"
                        : "bg-discord-dark-4 text-discord-text-muted hover:text-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full rounded-[3px] bg-discord-blurple py-1.5 text-xs font-semibold text-white hover:bg-discord-blurple-hover"
              >
                Create
              </button>
            </form>
          )}

          <div className="space-y-4">
            {rooms.length > 0 ? (
              roomsByType.map((group) =>
                group.rooms.length > 0 ? (
                  <div key={group.value} className="space-y-0.5">
                    <h3 className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">
                      {group.label}
                    </h3>
                    <div className="space-y-[2px]">
                      {group.rooms.map((room) => (
                        <button
                          key={room._id}
                          type="button"
                          onClick={() => handleSelectRoom(room._id)}
                          className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm transition-all group ${
                            room._id === activeRoomId
                              ? "bg-discord-dark-4 text-white"
                              : "text-discord-text-muted hover:bg-discord-dark-4/40 hover:text-discord-text-normal"
                          }`}
                        >
                          {/* Channel Type Prefix Icon */}
                          <span className="text-discord-text-muted group-hover:text-discord-text-normal">
                            {group.value === "text" ? (
                              <span className="font-semibold">#</span>
                            ) : group.value === "audio" ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </span>
                          <span className="truncate font-semibold">{room.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            ) : (
              <p className="rounded border border-dashed border-discord-dark-4 px-3 py-6 text-center text-xs text-discord-text-muted">
                No channels yet.
              </p>
            )}
          </div>
        </section>

        {/* Discord Bottom Status Bar */}
        <footer className="bg-discord-dark-5 p-2 flex items-center justify-between gap-2 border-t border-discord-dark-1/20 shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-discord-blurple text-xs font-bold text-white uppercase">
                {getInitial(user?.username)}
              </div>
              <span className="absolute bottom-[-1px] right-[-1px] h-3 w-3 rounded-full bg-discord-green border-2 border-discord-dark-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-discord-text-header">
                {user?.username || "You"}
              </p>
              <p className="text-[10px] text-discord-text-muted capitalize">
                {userRole || "member"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded p-1.5 hover:bg-discord-dark-4 text-discord-text-muted hover:text-discord-red transition"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </footer>
      </aside>

      {/* Chat Area */}
      <section className="flex min-w-0 flex-col bg-discord-dark-3 relative z-0">
        <header className="flex h-[48px] items-center justify-between border-b border-discord-dark-1/45 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl font-semibold text-discord-text-muted">#</span>
            <h2 className="truncate text-sm font-bold text-discord-text-header">
              {activeRoom ? activeRoom.name : "select-a-channel"}
            </h2>
            {activeRoom?.topic && (
              <>
                <div className="h-4 w-[1px] bg-discord-dark-4 mx-2" />
                <p className="truncate text-xs text-discord-text-muted font-medium">
                  {activeRoom.topic}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canManageRooms(userRole) && (
              <button
                type="button"
                onClick={handleOpenInvites}
                className="rounded-[3px] bg-discord-blurple px-3 py-1 text-xs font-semibold text-white transition hover:bg-discord-blurple-hover"
              >
                Invite
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5 border border-discord-dark-4 bg-discord-dark-5/50 text-[10px] font-bold text-discord-green uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-discord-green animate-pulse" />
              {socket ? "Live" : "Offline"}
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {!activeRoom ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-discord-text-muted p-4">
              <div className="rounded-full bg-discord-dark-2 p-4 mb-3 text-discord-blurple">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-discord-text-header">Welcome to SyncSpace!</h3>
              <p className="mt-1 text-xs max-w-sm">Choose a channel from the left sidebar to start chatting or join voice rooms.</p>
            </div>
          ) : activeRoom.type !== "text" ? (
            <div className="h-full px-2">
              {callSession ? (
                <LiveKitRoom
                  token={callSession.token}
                  serverUrl={callSession.serverUrl}
                  connect
                  audio
                  video={callSession.roomType === "video"}
                  onDisconnected={() => setCallSession(null)}
                  onError={(nextError) => setCallError(nextError.message)}
                  className="h-full overflow-hidden rounded-lg border border-discord-dark-4 bg-discord-dark-1"
                >
                  {callSession.roomType === "audio" ? (
                    <AudioConference />
                  ) : (
                    <VideoConference />
                  )}
                </LiveKitRoom>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md text-center bg-discord-dark-2 p-8 rounded-lg border border-discord-dark-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-discord-blurple/10 text-discord-blurple text-2xl">
                      {activeRoom.type === "audio" ? (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-discord-text-header">
                      {activeRoom.name}
                    </h3>
                    <p className="mt-2 text-sm text-discord-text-muted">
                      {activeRoom.type === "audio"
                        ? "Join this voice channel to talk with your workspace team."
                        : "Start a dynamic video call room with screen sharing."}
                    </p>
                    {callError && (
                      <p className="mt-4 rounded border border-discord-red/40 bg-discord-red/10 px-3 py-2 text-xs font-medium text-discord-red">
                        {callError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleJoinCall}
                      disabled={joiningCall}
                      className="mt-6 rounded-[4px] bg-discord-blurple px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-discord-blurple-hover disabled:cursor-not-allowed disabled:bg-discord-dark-5"
                    >
                      {joiningCall
                        ? "Connecting..."
                        : `Join ${activeRoom.type === "audio" ? "Voice Channel" : "Video Conference"}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : messagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-discord-blurple border-t-transparent" />
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messageActionError && (
                <p className="rounded border border-discord-red/40 bg-discord-red/10 px-3 py-2 text-xs text-discord-red">
                  {messageActionError}
                </p>
              )}
              {messages.map((message) => (
                <article key={message._id} className="group relative flex gap-3 p-1.5 rounded hover:bg-discord-dark-4/30 transition-all">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-discord-blurple/25 text-sm font-semibold text-white uppercase shadow-inner">
                    {getInitial(message.author?.username)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-bold text-discord-text-header text-sm cursor-pointer hover:underline">
                        {message.author?.username || "Unknown"}
                      </h3>
                      <span className="text-[10px] text-discord-text-muted">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {message.isEdited && (
                        <span className="text-[9px] text-discord-text-muted uppercase tracking-wider font-bold">edited</span>
                      )}
                    </div>
                    {editingMessageId === message._id ? (
                      <form
                        onSubmit={(event) =>
                          handleEditMessage(event, message._id)
                        }
                        className="mt-2 space-y-2"
                      >
                        <textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-[4px] border border-discord-dark-5 bg-discord-dark-5 px-3 py-2 text-sm text-discord-text-normal outline-none focus:border-discord-blurple"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-[3px] bg-discord-blurple px-3 py-1.5 text-xs font-semibold text-white hover:bg-discord-blurple-hover"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingMessage}
                            className="rounded-[3px] bg-discord-dark-4 px-3 py-1.5 text-xs font-semibold text-discord-text-normal hover:bg-[#4e5058] hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-discord-text-normal">
                        {message.content}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {message.reactions?.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          onClick={() =>
                            handleReactToMessage(message._id, reaction.emoji)
                          }
                          className="rounded-[4px] border border-discord-dark-4 bg-discord-dark-2 px-2 py-0.5 text-xs text-discord-text-normal hover:border-discord-blurple hover:bg-discord-dark-4 transition"
                        >
                          {reaction.emoji} <span className="font-semibold text-[10px]">{reaction.users?.length || 0}</span>
                        </button>
                      ))}

                      {canSendMessage(userRole) &&
                        quickReactions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              handleReactToMessage(message._id, emoji)
                            }
                            className="rounded-[4px] bg-discord-dark-2 px-2 py-0.5 text-xs text-discord-text-muted opacity-0 group-hover:opacity-100 hover:text-white hover:bg-discord-dark-4 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Absolute Edit/Delete Action box visible on Hover */}
                  {canManageMessage(message) && editingMessageId !== message._id && (
                    <div className="absolute right-4 top-2 hidden group-hover:flex items-center rounded border border-discord-dark-4 bg-discord-dark-2 shadow-md">
                      {getUserId(message.author) === getUserId(user) && (
                        <button
                          type="button"
                          onClick={() => startEditingMessage(message)}
                          className="p-1 px-2.5 text-xs text-discord-text-muted hover:text-white hover:bg-discord-dark-4 transition"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(message._id)}
                        className="p-1 px-2.5 text-xs text-discord-red hover:bg-discord-red/10 transition border-l border-discord-dark-4"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-discord-text-muted font-medium">
              No messages in this channel yet. Send a message to start the conversation!
            </div>
          )}
        </div>

        {/* Discord Chat Send Box */}
        <form onSubmit={handleSendMessage} className="p-4 bg-discord-dark-3 pt-0">
          <div className="flex items-end gap-3 rounded-lg bg-discord-dark-4 px-4 py-2.5 border border-transparent focus-within:border-discord-blurple transition">
            <button
              type="button"
              className="grid h-6 w-6 place-items-center rounded-full bg-discord-text-muted/20 text-discord-text-muted hover:bg-discord-text-muted/40 hover:text-white transition cursor-pointer"
            >
              +
            </button>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={
                !activeRoom ||
                activeRoom.type !== "text" ||
                !canSendMessage(userRole)
              }
              placeholder={
                activeRoom?.type === "text"
                  ? `Message #${activeRoom.name}`
                  : activeRoom
                    ? "Messages are only available in text channels"
                    : "Select a channel first"
              }
              rows={1}
              className="max-h-24 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-sm text-discord-text-normal outline-none placeholder-[#5c5e66] disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={
                !draft.trim() ||
                !activeRoom ||
                activeRoom.type !== "text" ||
                !canSendMessage(userRole)
              }
              className="rounded-[4px] bg-discord-blurple px-4 py-1.5 text-xs font-bold text-white transition hover:bg-discord-blurple-hover disabled:cursor-not-allowed disabled:bg-discord-dark-5 disabled:text-discord-text-muted"
            >
              Send
            </button>
          </div>
        </form>
      </section>

      {/* Rightmost Member Sidebar */}
      <aside className="min-h-0 bg-discord-dark-2 z-10 border-l border-discord-dark-1/20 flex flex-col">
        <header className="flex h-[48px] items-center px-4 border-b border-discord-dark-1/45 shadow-[0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="font-bold text-xs uppercase tracking-wider text-discord-text-muted">
            Members — {workspace?.members?.length || 0}
          </h2>
        </header>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {workspace?.members?.map((member) => (
            <div
              key={getUserId(member.user)}
              className="flex items-center gap-3 rounded-[4px] px-2 py-1.5 hover:bg-discord-dark-4/30 transition-all cursor-pointer group"
            >
              <div className="relative shrink-0">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-discord-blurple/20 text-xs font-bold text-white uppercase shadow">
                  {getInitial(getMemberName(member))}
                </div>
                <span
                  className={`absolute bottom-[-1px] right-[-1px] h-3 w-3 rounded-full border-2 border-discord-dark-2 ${
                    member.user?.status === "online"
                      ? "bg-discord-green"
                      : "bg-[#747f8d]"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-discord-text-normal group-hover:text-white transition">
                  {getMemberName(member)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-discord-text-muted font-extrabold capitalize scale-90 origin-left">
                  {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Invites Popup Redesigned as Discord styled Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fadeIn">
          <section className="max-h-[86vh] w-full max-w-[440px] overflow-hidden rounded-lg bg-discord-dark-2 shadow-2xl border border-discord-dark-4/40 flex flex-col">
            <header className="flex items-center justify-between border-b border-discord-dark-1/45 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-discord-text-header">Invite Friends</h2>
                <p className="text-xs text-discord-text-muted mt-0.5">Invite others to #{activeRoom?.name || "Server"}</p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="text-discord-text-muted hover:text-white transition text-lg"
              >
                &times;
              </button>
            </header>

            <div className="max-h-[calc(86vh-73px)] overflow-y-auto p-5 space-y-5">
              <form
                onSubmit={handleCreateInvite}
                className="space-y-4 bg-discord-dark-3 p-4 rounded border border-discord-dark-4/50"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-discord-text-muted">
                    Assign Role
                    <select
                      value={inviteForm.assignedRole}
                      onChange={(event) =>
                        setInviteForm((currentForm) => ({
                          ...currentForm,
                          assignedRole: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-[4px] border border-discord-dark-5 bg-discord-dark-5 px-2.5 py-2 text-xs outline-none text-white focus:border-discord-blurple"
                    >
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="text-[11px] font-bold uppercase tracking-wider text-discord-text-muted">
                    Expires
                    <select
                      value={inviteForm.expiresInDays}
                      onChange={(event) =>
                        setInviteForm((currentForm) => ({
                          ...currentForm,
                          expiresInDays: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-[4px] border border-discord-dark-5 bg-discord-dark-5 px-2.5 py-2 text-xs outline-none text-white focus:border-discord-blurple"
                    >
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </label>
                </div>

                <label className="block text-[11px] font-bold uppercase tracking-wider text-discord-text-muted">
                  Max Uses
                  <input
                    value={inviteForm.maxUses}
                    onChange={(event) =>
                      setInviteForm((currentForm) => ({
                        ...currentForm,
                        maxUses: event.target.value,
                      }))
                    }
                    min="1"
                    type="number"
                    placeholder="Unlimited"
                    className="mt-2 w-full rounded-[4px] border border-discord-dark-5 bg-discord-dark-5 px-2.5 py-2 text-xs outline-none text-white placeholder-[#5c5e66] focus:border-discord-blurple"
                  />
                </label>

                <button
                  type="submit"
                  disabled={inviteCreating}
                  className="w-full rounded-[4px] bg-discord-blurple py-2 text-xs font-bold text-white transition hover:bg-discord-blurple-hover"
                >
                  {inviteCreating ? "Generating..." : "Generate Invite Link"}
                </button>
              </form>

              {inviteError && (
                <p className="rounded-[4px] border border-discord-red/30 bg-discord-red/10 px-3 py-2 text-xs text-discord-red">
                  {inviteError}
                </p>
              )}

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted">
                  Active Links
                </h3>

                {invitesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
                  </div>
                ) : invites.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {invites.map((invite) => (
                      <article
                        key={invite._id}
                        className="rounded bg-discord-dark-3 p-3 border border-discord-dark-4/50 flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={getInviteLink(invite.code)}
                            className="flex-1 truncate rounded bg-discord-dark-5 px-2 py-1 text-xs text-discord-text-muted outline-none border border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyInvite(invite.code)}
                            className="rounded bg-discord-blurple px-3 py-1 text-xs font-bold text-white hover:bg-discord-blurple-hover shrink-0 transition"
                          >
                            {copiedCode === invite.code ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-discord-text-muted font-bold">
                          <span>
                            {invite.assignedRole.toUpperCase()} &bull; {invite.uses}
                            {invite.maxUses === -1 ? " uses" : `/${invite.maxUses} uses`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(invite._id)}
                            className="text-discord-red hover:underline"
                          >
                            Revoke
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-discord-text-muted">
                    No active invite links found.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default AppLayout;
