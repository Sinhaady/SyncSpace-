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
    <main className="grid h-screen grid-cols-[72px_260px_minmax(0,1fr)_280px] bg-gray-950 text-gray-100">
      <aside className="flex flex-col items-center gap-4 border-r border-gray-800 bg-gray-950 px-3 py-4">
        <Link
          to="/dashboard"
          className="grid h-12 w-12 place-items-center rounded-lg bg-indigo-600 text-lg font-bold text-white hover:bg-indigo-500"
          title="Dashboard"
        >
          S
        </Link>
        <div className="h-px w-10 bg-gray-800" />
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-gray-800 text-sm font-semibold">
          {getInitial(workspace?.name)}
        </div>
      </aside>

      <aside className="flex min-h-0 flex-col border-r border-gray-800 bg-gray-900">
        <header className="border-b border-gray-800 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Workspace
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold">
            {workspace?.name}
          </h1>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Channels
            </h2>
            {canManageRooms(userRole) && (
              <button
                type="button"
                onClick={() => setShowRoomForm((value) => !value)}
                className="grid h-7 w-7 place-items-center rounded-md bg-gray-800 text-lg leading-none hover:bg-gray-700"
                title="Create channel"
              >
                +
              </button>
            )}
          </div>

          {showRoomForm && (
            <form
              onSubmit={handleCreateRoom}
              className="mb-4 space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-2"
            >
              <input
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="channel-name"
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-3 gap-1">
                {channelTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewRoomType(type.value)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                      newRoomType === type.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                Add channel
              </button>
            </form>
          )}

          <div className="space-y-5">
            {rooms.length > 0 ? (
              roomsByType.map((group) =>
                group.rooms.length > 0 ? (
                  <div key={group.value}>
                    <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {group.label} channels
                    </h3>
                    <div className="space-y-1">
                      {group.rooms.map((room) => (
                        <button
                          key={room._id}
                          type="button"
                          onClick={() => handleSelectRoom(room._id)}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                            room._id === activeRoomId
                              ? "bg-gray-800 text-white"
                              : "text-gray-400 hover:bg-gray-800/70 hover:text-gray-100"
                          }`}
                        >
                          <span className="w-4 text-gray-500">
                            {group.icon}
                          </span>
                          <span className="truncate">{room.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            ) : (
              <p className="rounded-lg border border-dashed border-gray-700 px-3 py-6 text-center text-sm text-gray-500">
                No channels yet.
              </p>
            )}
          </div>
        </section>

        <footer className="border-t border-gray-800 p-3">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-950 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.username || "You"}
              </p>
              <p className="text-xs capitalize text-gray-500">
                {userRole || "member"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        </footer>
      </aside>

      <section className="flex min-w-0 flex-col bg-gray-950">
        <header className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {activeRoom
                ? `${channelTypes.find((type) => type.value === activeRoom.type)?.icon || "#"} ${activeRoom.name}`
                : "Select a channel"}
            </h2>
            {activeRoom?.topic && (
              <p className="truncate text-sm text-gray-500">
                {activeRoom.topic}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canManageRooms(userRole) && (
              <button
                type="button"
                onClick={handleOpenInvites}
                className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-100 hover:bg-gray-700"
              >
                Invite
              </button>
            )}
            <div className="rounded-full border border-gray-800 px-3 py-1 text-xs text-gray-400">
              {socket ? "Live" : "Connecting"}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!activeRoom ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Choose a channel to start.
            </div>
          ) : activeRoom.type !== "text" ? (
            <div className="h-full px-6">
              {callSession ? (
                <LiveKitRoom
                  token={callSession.token}
                  serverUrl={callSession.serverUrl}
                  connect
                  audio
                  video={callSession.roomType === "video"}
                  onDisconnected={() => setCallSession(null)}
                  onError={(nextError) => setCallError(nextError.message)}
                  className="h-full overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
                >
                  {callSession.roomType === "audio" ? (
                    <AudioConference />
                  ) : (
                    <VideoConference />
                  )}
                </LiveKitRoom>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-gray-900 text-2xl font-semibold">
                      {activeRoom.type === "audio" ? "A" : "V"}
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold">
                      {activeRoom.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                      {activeRoom.type === "audio"
                        ? "Join this voice channel to talk with your workspace."
                        : "Join this video channel to start a team meeting."}
                    </p>
                    {callError && (
                      <p className="mt-4 rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                        {callError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleJoinCall}
                      disabled={joiningCall}
                      className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                    >
                      {joiningCall
                        ? "Connecting..."
                        : `Join ${activeRoom.type === "audio" ? "voice" : "video"}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : messagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-5">
              {messageActionError && (
                <p className="rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {messageActionError}
                </p>
              )}
              {messages.map((message) => (
                <article key={message._id} className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-800 text-sm font-semibold">
                    {getInitial(message.author?.username)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-medium">
                        {message.author?.username || "Unknown user"}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {message.isEdited && (
                        <span className="text-xs text-gray-500">edited</span>
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
                          className="w-full resize-none rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingMessage}
                            className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-gray-300">
                        {message.content}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {message.reactions?.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          onClick={() =>
                            handleReactToMessage(message._id, reaction.emoji)
                          }
                          className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:border-indigo-500"
                        >
                          {reaction.emoji} {reaction.users?.length || 0}
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
                            className="rounded-md bg-gray-900 px-2 py-1 text-xs text-gray-500 hover:text-white"
                          >
                            {emoji}
                          </button>
                        ))}

                      {canManageMessage(message) &&
                        editingMessageId !== message._id && (
                          <>
                            {getUserId(message.author) === getUserId(user) && (
                              <button
                                type="button"
                                onClick={() => startEditingMessage(message)}
                                className="rounded-md bg-gray-900 px-2 py-1 text-xs text-gray-500 hover:text-white"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message._id)}
                              className="rounded-md bg-gray-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                            >
                              Delete
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No messages in this channel yet.
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="border-t border-gray-800 p-4">
          <div className="flex items-end gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
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
                    ? "Messages are available in text channels"
                    : "Select a channel first"
              }
              rows={1}
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-gray-600 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={
                !draft.trim() ||
                !activeRoom ||
                activeRoom.type !== "text" ||
                !canSendMessage(userRole)
              }
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              Send
            </button>
          </div>
        </form>
      </section>

      <aside className="min-h-0 border-l border-gray-800 bg-gray-900">
        <header className="border-b border-gray-800 px-4 py-4">
          <h2 className="font-semibold">Members</h2>
          <p className="text-sm text-gray-500">
            {workspace?.members?.length || 0} in workspace
          </p>
        </header>

        <div className="space-y-2 overflow-y-auto p-3">
          {workspace?.members?.map((member) => (
            <div
              key={getUserId(member.user)}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-800 text-sm font-semibold">
                {getInitial(getMemberName(member))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {getMemberName(member)}
                </p>
                <p className="text-xs capitalize text-gray-500">
                  {member.role}
                </p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  member.user?.status === "online"
                    ? "bg-emerald-400"
                    : "bg-gray-700"
                }`}
                title={member.user?.status || "offline"}
              />
            </div>
          ))}
        </div>
      </aside>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <section className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-2xl">
            <header className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Invite people</h2>
                <p className="text-sm text-gray-500">{workspace?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                x
              </button>
            </header>

            <div className="max-h-[calc(86vh-73px)] overflow-y-auto p-5">
              <form
                onSubmit={handleCreateInvite}
                className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4 sm:grid-cols-3"
              >
                <label className="text-sm font-medium text-gray-300">
                  Role
                  <select
                    value={inviteForm.assignedRole}
                    onChange={(event) =>
                      setInviteForm((currentForm) => ({
                        ...currentForm,
                        assignedRole: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-300">
                  Expires
                  <select
                    value={inviteForm.expiresInDays}
                    onChange={(event) =>
                      setInviteForm((currentForm) => ({
                        ...currentForm,
                        expiresInDays: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-300">
                  Max uses
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
                    className="mt-2 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none placeholder:text-gray-600 focus:border-indigo-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={inviteCreating}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500 sm:col-span-3"
                >
                  {inviteCreating ? "Creating..." : "Create invite link"}
                </button>
              </form>

              {inviteError && (
                <p className="mt-4 rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {inviteError}
                </p>
              )}

              <div className="mt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Active links
                </h3>

                {invitesLoading ? (
                  <div className="mt-4 h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                ) : invites.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {invites.map((invite) => (
                      <article
                        key={invite._id}
                        className="rounded-lg border border-gray-800 bg-gray-950 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <input
                              readOnly
                              value={getInviteLink(invite.code)}
                              className="w-full truncate rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300 outline-none"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                              {invite.assignedRole} - {invite.uses}
                              {invite.maxUses === -1
                                ? " uses"
                                : `/${invite.maxUses} uses`}{" "}
                              - expires{" "}
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyInvite(invite.code)}
                              className="rounded-md bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-700"
                            >
                              {copiedCode === invite.code ? "Copied" : "Copy"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(invite._id)}
                              className="rounded-md bg-red-950 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-900"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
                    No active invite links yet.
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
