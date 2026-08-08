// blabs related API
app.get('/blabs', async (req, res) => {
  const { blabsCollection } = await getCollections();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const total = await blabsCollection.estimatedDocumentCount();
  const result = await blabsCollection.find().sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
  res.json({ data: result, totalPages: Math.ceil(total / limit) });
});

app.patch("/blabs/applause/:id", verifyFirebaseToken, async (req, res) => {
  const { blabsCollection } = await getCollections();
  const blabId = req.params.id;
  const userId = req.decoded.uid;
  const query = { _id: new ObjectId(blabId) };
  const blab = await blabsCollection.findOne(query);
  const alreadyApplauded = blab.applause.includes(userId);
  if (alreadyApplauded) {
    await blabsCollection.updateOne(query, { $pull: { applause: userId }, $inc: { applauseCount: -1 } });
  } else {
    await blabsCollection.updateOne(query, { $addToSet: { applause: userId }, $inc: { applauseCount: 1 } });
  }
  res.send({ success: true });
});

app.get('/blabdetails/:id', verifyFirebaseToken, async (req, res) => {
  const { blabsCollection } = await getCollections();
  const result = await blabsCollection.findOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

app.get('/blabs/:id', verifyFirebaseToken, async (req, res) => {
  const { blabsCollection } = await getCollections();
  const result = await blabsCollection.find({ authorId: req.params.id }).sort({ createdAt: -1 }).toArray();
  res.send(result);
});

app.post('/blabs', async (req, res) => {
  const { blabsCollection, usersCollection } = await getCollections();
  const { content, authorId, authorUsername } = req.body;
  const newBlab = {
    content, authorId, authorUsername,
    applause: [], applauseCount: 0, echoesCount: 0,
    createdAt: new Date()
  };
  const result = await blabsCollection.insertOne(newBlab);
  await usersCollection.updateOne({ fb_uid: authorId }, { $inc: { blabsCount: 1 } });
  res.send(result);
});

app.delete('/blabs/delete/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { blabsCollection, usersCollection, echoesCollection } = await getCollections();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const blab = await blabsCollection.findOne(query);
    if (!blab) return res.status(404).send({ success: false, message: "Blab not found" });
    await blabsCollection.deleteOne(query);
    await echoesCollection.deleteMany({ blabId: id });
    if (blab.authorId) {
      await usersCollection.updateOne({ fb_uid: blab.authorId }, { $inc: { blabsCount: -1 } });
    }
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});
app.patch('/editedBlab/:id', async (req, res) => {
  const { id } = req.params
  const { content } = req.body
  const query = { _id: new ObjectId(id) }
  const { blabsCollection } = await getCollections();
  const result = await blabsCollection.updateOne(query,
    {
      $set: {
        content: content
      }
    }
  )
  res.send(result)
})
// echoes related API
app.get("/blab/echoes/:id", verifyFirebaseToken, async (req, res) => {
  const { echoesCollection } = await getCollections();
  const result = await echoesCollection.find({ blabId: req.params.id }).sort({ createdAt: -1 }).toArray();
  res.send(result);
});

app.post('/blabs/echoes', async (req, res) => {
  const { echoesCollection, blabsCollection } = await getCollections();
  const { content, blabId, authorId, authorUsername } = req.body;
  const newEchoe = {
    blabId, content, authorId,
    applause: [], applauseCount: 0,
    authorUserName: authorUsername,
    createdAt: new Date()
  };
  const result = await echoesCollection.insertOne(newEchoe);
  await blabsCollection.updateOne({ _id: new ObjectId(blabId) }, { $inc: { echoesCount: 1 } });
  res.send(result);
});
app.patch("/editedEcho/:id", async (req, res) => {
  const { id } = req.params
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Content cannot be empty" })
  }

  const query = { _id: new ObjectId(id) }
  const { echoesCollection } = await getCollections();
  const result = await echoesCollection.updateOne(query,
    {
      $set: {
        content: content.trim()
      }
    }
  )
  res.send(result)
})
app.patch('/echoe/applause/:id', verifyFirebaseToken, async (req, res) => {
  const { echoesCollection } = await getCollections();
  const id = req.params.id;
  const userId = req.decoded.uid;
  const query = { _id: new ObjectId(id) };
  const echoe = await echoesCollection.findOne(query);
  const alreadyApplauded = echoe.applause.includes(userId);
  if (alreadyApplauded) {
    await echoesCollection.updateOne(query, { $pull: { applause: userId }, $inc: { applauseCount: -1 } });
  } else {
    await echoesCollection.updateOne(query, { $addToSet: { applause: userId }, $inc: { applauseCount: 1 } });
  }
  res.send({ success: true });
});
app.delete("/deleteEcho/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const { echoesCollection, blabsCollection } = await getCollections();
  const echo = await echoesCollection.findOne(query);
  if (!echo) {
    return res.status(404).send({ message: "Echo not found" });
  }
  const result = await echoesCollection.deleteOne(query);
  const blabId = echo.blabId;
  await blabsCollection.updateOne(
    { _id: new ObjectId(blabId) },
    { $inc: { echoesCount: -1 } }
  );
  res.send(result);
});
// users related API
app.patch("/users/updateBio/:id", verifyFirebaseToken, async (req, res) => {
  const { id } = req.params
  const { bio } = req.body
  const trimBio = bio.trim()
  if (!trimBio) {
    return res.status(400).json({ success: false, message: "Bio cannot be empty" })
  }
  const query = { fb_uid: id }
  const { usersCollection } = await getCollections();
  const result = await usersCollection.updateOne(query, { $set: { bio: trimBio } })
  res.send(result)
})
app.get('/users/:id', async (req, res) => {
  const { usersCollection } = await getCollections();
  const result = await usersCollection.findOne({ fb_uid: req.params.id });
  res.send(result);
});

app.post('/users', async (req, res) => {
  const { usersCollection } = await getCollections();
  const { fb_uid, userName, email, photo } = req.body;
  console.log(photo);
  const existingUser = await usersCollection.findOne({ fb_uid });
  if (existingUser) return res.send(existingUser);
  const userInfo = { userName, email, fb_uid, bio: "", photo, createdAt: new Date() };
  const result = await usersCollection.insertOne(userInfo);
  res.send(result);
});

app.get('/conversations', verifyFirebaseToken, async (req, res) => {
  const { conversationsCollection, usersCollection } = await getCollections();
  const uid = req.decoded.uid;

  const convos = await conversationsCollection
    .find({ participants: uid })
    .sort({ updatedAt: -1 })
    .toArray();

  // attach the other person's info to each conversation
  // so the sidebar can show their name + photo
  const enriched = await Promise.all(
    convos.map(async (convo) => {
      const otherUid = convo.participants.find(p => p !== uid);
      const otherUser = await usersCollection.findOne(
        { fb_uid: otherUid },
        { projection: { userName: 1, photo: 1, fb_uid: 1 } }
      );
      return { ...convo, otherUser };
    })
  );

  res.json(enriched);
});
// Start or get a 1-on-1 conversation
app.post('/conversations', verifyFirebaseToken, async (req, res) => {
  const { conversationsCollection } = await getCollections();
  const uid = req.decoded.uid;
  const { recipientId } = req.body;

  if (uid === recipientId) {
    return res.status(400).json({ message: "Cannot chat with yourself" });
  }

  let convo = await conversationsCollection.findOne({
    participants: { $all: [uid, recipientId], $size: 2 }
  });

  if (!convo) {
    const result = await conversationsCollection.insertOne({
      participants: [uid, recipientId],
      lastMessage: null,
      updatedAt: new Date(),
      createdAt: new Date()
    });
    convo = await conversationsCollection.findOne({ _id: result.insertedId });
  }

  res.json(convo);
});
// Get messages for a conversation
app.get('/conversations/:id/messages', verifyFirebaseToken, async (req, res) => {
  const { messagesCollection } = await getCollections();
  const { page = 1, limit = 30 } = req.query;

  const messages = await messagesCollection
    .find({ conversationId: req.params.id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit))
    .toArray();

  res.json(messages.reverse());
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://blabber404.web.app',
      'https://blabber404.firebaseapp.com'
    ],
    credentials: true
  }
});

// verify firebase token before allowing socket connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const uid = socket.user.uid;
  console.log(`${uid} connected`);

  socket.on('join:conversations', (conversationIds) => {
    conversationIds.forEach(id => socket.join(id));
  });

  socket.on('message:send', async ({ conversationId, content }) => {
    if (!content?.trim()) return;
    const { messagesCollection, conversationsCollection } = await getCollections();

    const message = {
      conversationId,
      sender: uid,
      content: content.trim(),
      readBy: [uid],
      createdAt: new Date()
    };

    const result = await messagesCollection.insertOne(message);

    await conversationsCollection.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessage: { content: content.trim(), sender: uid, createdAt: message.createdAt },
          updatedAt: new Date()
        }
      }
    );

    io.to(conversationId).emit('message:new', { ...message, _id: result.insertedId });
  });

  socket.on('typing:start', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:start', { uid, conversationId });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(conversationId).emit('typing:stop', { uid, conversationId });
  });

  socket.on('message:read', async ({ conversationId }) => {
    const { messagesCollection } = await getCollections();
    await messagesCollection.updateMany(
      { conversationId, readBy: { $ne: uid } },
      { $push: { readBy: uid } }
    );
    socket.to(conversationId).emit('message:read', { conversationId, uid });
  });

  socket.on('disconnect', () => {
    console.log(`${uid} disconnected`);
  });
});

// routes defined BEFORE server.listen
app.get('/', (req, res) => {
  res.send("blabber server is making noise");
});

server.listen(port, () => {
  console.log(`Blabber running on port ${port}`);
});