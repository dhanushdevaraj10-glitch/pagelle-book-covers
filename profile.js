import {
  getCurrentSession,
  syncCommunityCovers,
  loadUserBooks,
  loadFavorites,
  findBookById,
  getAllBooks,
  createBookCardElement,
  initAuthHeader,
  createDetailModalController,
  showToast,
  updateCurrentProfile,
  deleteAccount,
  openConfirmModal,
  OWNER_EMAIL,
  COMMUNITY_MEMBERS,
  getAllCommunityMembers,
  syncCommunityMembersFromServer,
  getFollowingUserIds,
  isFollowingUser,
  toggleFollowUser,
  getFollowersForUser,
  getFollowingForUser,
  getUserProfileByIdOrEmail,
  getMemberPosts
} from './shared.js?v=2.0.1';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
  initAuthHeader();

  const session = getCurrentSession();
  if (!session) {
    window.location.replace('login.html?next=profile.html');
    return;
  }

  // 1. Resolve which profile to display (own profile vs community member)
  const urlParams = new URLSearchParams(window.location.search);
  const targetParam = urlParams.get('user') || urlParams.get('id') || urlParams.get('email');
  let targetProfile = targetParam ? getUserProfileByIdOrEmail(targetParam) : null;
  const activeUser = targetProfile || session;

  // Sync community members in the background
  syncCommunityMembersFromServer().then(() => {
    if (targetParam && !targetProfile) {
      const refreshed = getUserProfileByIdOrEmail(targetParam);
      if (refreshed) {
        window.location.reload();
      }
    }
  }).catch(() => {});

  const isSelf = !targetParam || (
    (activeUser.email && activeUser.email.toLowerCase() === session.email.toLowerCase()) ||
    (activeUser.id && (activeUser.id === session.userId || activeUser.id === session.id))
  );

  // 2. DOM elements
  const avatarImg = document.getElementById('profileAvatarImg');
  const nameEl = document.getElementById('profileDisplayName');
  const bioEl = document.getElementById('profileBio');
  const followersEl = document.getElementById('profileFollowers');
  const followingEl = document.getElementById('profileFollowing');
  const postsCountEl = document.getElementById('profilePostsCount');
  const tabCreatedCountEl = document.getElementById('tabCreatedCount');
  const tabSavedCountEl = document.getElementById('tabSavedCount');

  const viewingBanner = document.getElementById('profileViewingBanner');
  const userPostsGrid = document.getElementById('userPostsGrid');
  const userPostsEmpty = document.getElementById('userPostsEmpty');
  const userSavedGrid = document.getElementById('userSavedGrid');
  const userSavedEmpty = document.getElementById('userSavedEmpty');

  const tabCreated = document.getElementById('tabCreated');
  const tabSaved = document.getElementById('tabSaved');
  const panelCreated = document.getElementById('panelCreated');
  const panelSaved = document.getElementById('panelSaved');
  const shareBtn = document.getElementById('profileShareBtn');

  // Change Profile Picture elements
  const avatarPlusBtn = document.getElementById('profileAvatarPlusBtn');
  const avatarFileInput = document.getElementById('profileAvatarFileInput');

  // Follow Button elements
  const followBtn = document.getElementById('profileFollowBtn');
  const followLabel = document.getElementById('profileFollowLabel');
  const followIconPlus = followBtn?.querySelector('.follow-icon-plus');
  const followIconCheck = followBtn?.querySelector('.follow-icon-check');

  // Edit Profile elements
  const editBtn = document.getElementById('profileEditBtn');
  const profileAdminBtn = document.getElementById('profileAdminBtn');
  const createBtn = document.getElementById('profileCreateBtn');
  const quickEditBtn = document.getElementById('profileQuickEditBtn');
  const editModalOverlay = document.getElementById('editProfileModalOverlay');
  const editModalCloseBtn = document.getElementById('editProfileCloseBtn');
  const editModalCancelBtn = document.getElementById('editProfileCancelBtn');
  const editForm = document.getElementById('editProfileForm');
  const editNameInput = document.getElementById('editProfileNameInput');
  const editBioInput = document.getElementById('editProfileBioInput');
  const bioCharCount = document.getElementById('bioCharCount');
  const editAvatarPreview = document.getElementById('editModalAvatarPreview');
  const editAvatarPickBtn = document.getElementById('editModalAvatarPickBtn');

  // Interactive Stats elements (Followers, Following & Find Profiles modal)
  const openExploreMembersBtn = document.getElementById('openExploreMembersBtn');
  const openFollowersBtn = document.getElementById('openFollowersBtn');
  const openFollowingBtn = document.getElementById('openFollowingBtn');
  const followListModalOverlay = document.getElementById('followListModalOverlay');
  const followModalCloseBtn = document.getElementById('followModalCloseBtn');
  const followModalTitle = document.getElementById('followModalTitle');
  const followModalSub = document.getElementById('followModalSub');
  const tabModalExplore = document.getElementById('tabExplore');
  const tabModalFollowers = document.getElementById('tabFollowers');
  const tabModalFollowing = document.getElementById('tabFollowing');
  const modalExploreCountEl = document.getElementById('modalExploreCount');
  const modalFollowersCountEl = document.getElementById('modalFollowersCount');
  const modalFollowingCountEl = document.getElementById('modalFollowingCount');
  const followSearchInput = document.getElementById('followSearchInput');
  const followSearchClear = document.getElementById('followSearchClear');
  const followListContainer = document.getElementById('followListContainer');

  let activeFollowTab = 'explore';
  let pendingAvatarDataUrl = null;

  // 3. Render Profile Header Info
  nameEl.textContent = activeUser.name || (activeUser.email ? activeUser.email.split('@')[0] : 'User');
  const isOwner = activeUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const fallbackAvatar = isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png';
  avatarImg.src = activeUser.avatar || fallbackAvatar;
  avatarImg.onerror = () => {
    avatarImg.src = fallbackAvatar;
  };

  if (activeUser.bio && activeUser.bio.trim()) {
    bioEl.textContent = activeUser.bio.trim();
    bioEl.classList.remove('hidden');
  } else if (isOwner) {
    bioEl.textContent = 'Thick Thighs pretty eyes';
    bioEl.classList.remove('hidden');
  } else {
    bioEl.textContent = '';
    bioEl.classList.add('hidden');
  }

  // Handle Viewing Self vs Community Member
  const isOwnerAdmin = session.role === 'admin' || (session.email && session.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
  if (isSelf) {
    if (viewingBanner) viewingBanner.classList.add('hidden');
    if (avatarPlusBtn) avatarPlusBtn.classList.remove('hidden');
    if (quickEditBtn) quickEditBtn.classList.remove('hidden');
    if (editBtn) editBtn.classList.remove('hidden');
    if (profileAdminBtn) profileAdminBtn.classList.toggle('hidden', !isOwnerAdmin);
    if (createBtn) createBtn.classList.remove('hidden');
    if (followBtn) followBtn.classList.add('hidden');
  } else {
    if (viewingBanner) viewingBanner.classList.remove('hidden');
    if (avatarPlusBtn) avatarPlusBtn.classList.add('hidden');
    if (quickEditBtn) quickEditBtn.classList.add('hidden');
    if (editBtn) editBtn.classList.add('hidden');
    if (profileAdminBtn) profileAdminBtn.classList.add('hidden');
    if (createBtn) createBtn.classList.add('hidden');
    if (followBtn) followBtn.classList.remove('hidden');
  }

  // 4. Follow Button Interaction
  function updateFollowButtonUI() {
    if (!followBtn) return;
    if (isSelf) {
      followBtn.classList.add('hidden');
      updateFollowersCountDisplay();
      return;
    }
    followBtn.classList.remove('hidden');
    const targetId = activeUser.id || activeUser.userId;
    const isFollowing = isFollowingUser(targetId);

    if (isFollowing) {
      followBtn.classList.add('is-following');
      if (followLabel) followLabel.textContent = 'Following';
      followIconPlus?.classList.add('hidden');
      followIconCheck?.classList.remove('hidden');
    } else {
      followBtn.classList.remove('is-following');
      if (followLabel) followLabel.textContent = 'Follow';
      followIconPlus?.classList.remove('hidden');
      followIconCheck?.classList.add('hidden');
    }

    // Refresh followers count on hero
    updateFollowersCountDisplay();
  }

  function updateFollowersCountDisplay() {
    const followers = getFollowersForUser(activeUser);
    followersEl.textContent = String(followers.length);
    if (isSelf) {
      const followingIds = getFollowingUserIds();
      followingEl.textContent = String(followingIds.length);
    } else {
      const following = getFollowingForUser(activeUser);
      followingEl.textContent = String(following.length);
    }
  }

  updateFollowButtonUI();

  if (followBtn) {
    followBtn.addEventListener('click', () => {
      if (isSelf) return; // Prevent any self-follow
      const targetId = activeUser.id || activeUser.userId;
      if (!targetId) return;
      const nowFollowing = toggleFollowUser(targetId);
      updateFollowButtonUI();

      if (nowFollowing) {
        showToast(`You are now following ${activeUser.name || 'this member'}!`);
      } else {
        showToast(`Unfollowed ${activeUser.name || 'this member'}.`);
      }

      // If follow modal is currently open, refresh it live
      if (followListModalOverlay && !followListModalOverlay.classList.contains('hidden')) {
        renderFollowList();
      }
    });
  }

  // 5. Change Profile Picture (+ symbol on avatar)
  function triggerAvatarPick() {
    if (!isSelf) return;
    avatarFileInput.click();
  }

  if (avatarPlusBtn) {
    avatarPlusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAvatarPick();
    });
  }

  if (editAvatarPickBtn) {
    editAvatarPickBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAvatarPick();
    });
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (JPG, PNG, WebP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawData = ev.target?.result;
        if (!rawData) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          pendingAvatarDataUrl = optimizedDataUrl;
          avatarImg.src = optimizedDataUrl;
          if (editAvatarPreview) editAvatarPreview.src = optimizedDataUrl;

          updateCurrentProfile({ avatar: optimizedDataUrl });
          showToast('Profile picture updated successfully!');
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  }

  // 6. Edit Profile Modal (Name & Bio)
  function openEditModal() {
    if (!editModalOverlay || !isSelf) return;
    const cur = getCurrentSession() || session;
    editNameInput.value = cur.name || '';
    editBioInput.value = cur.bio || '';
    bioCharCount.textContent = String(editBioInput.value.length);
    if (editAvatarPreview) {
      editAvatarPreview.src = cur.avatar || 'assets/default-avatar.png';
    }
    editModalOverlay.classList.remove('hidden');
    setTimeout(() => editNameInput.focus(), 100);
  }

  function closeEditModal() {
    if (!editModalOverlay) return;
    editModalOverlay.classList.add('hidden');
    pendingAvatarDataUrl = null;
  }

  if (editBtn) editBtn.addEventListener('click', openEditModal);
  if (quickEditBtn) quickEditBtn.addEventListener('click', openEditModal);
  if (editModalCloseBtn) editModalCloseBtn.addEventListener('click', closeEditModal);
  if (editModalCancelBtn) editModalCancelBtn.addEventListener('click', closeEditModal);

  if (editBioInput) {
    editBioInput.addEventListener('input', () => {
      bioCharCount.textContent = String(editBioInput.value.length);
    });
  }

  if (editModalOverlay) {
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditModal();
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = editNameInput.value.trim();
      const newBio = editBioInput.value.trim();

      if (!newName) {
        showToast('Display name cannot be empty.');
        editNameInput.focus();
        return;
      }

      updateCurrentProfile({
        name: newName,
        bio: newBio,
        avatar: pendingAvatarDataUrl || session.avatar
      });

      nameEl.textContent = newName;
      if (newBio && newBio.trim()) {
        bioEl.textContent = newBio.trim();
        bioEl.classList.remove('hidden');
      } else {
        bioEl.textContent = '';
        bioEl.classList.add('hidden');
      }
      if (pendingAvatarDataUrl) {
        avatarImg.src = pendingAvatarDataUrl;
      }

      closeEditModal();
      showToast('Profile updated successfully!');
    });
  }

  // Delete Account Action
  const deleteAccountBtn = document.getElementById('profileDeleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      closeEditModal();
      if (session.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        showToast('The primary administrator account cannot be deleted.');
        return;
      }
      openConfirmModal({
        title: 'Delete This Account?',
        message: `Are you sure you want to permanently delete your account <strong>${escapeHtml(session.name || session.email)}</strong> (${escapeHtml(session.email)})?`,
        subtext: 'This will permanently remove your profile, account login, and all covers you posted.',
        confirmLabel: 'Yes, Delete Account',
        isDanger: true,
        onConfirm: () => deleteAccount(session.email)
      });
    });
  }

  // 7. Detail modal for book covers
  const detailModal = createDetailModalController({
    onBooksChanged: () => {
      renderProfileData();
    }
  });

  // Sync freshest data from server
  await syncCommunityCovers();

  // 8. Render Book Covers Gallery for active user
  function renderProfileData() {
    const memberCovers = getMemberPosts(activeUser);

    postsCountEl.textContent = String(memberCovers.length);
    tabCreatedCountEl.textContent = String(memberCovers.length);

    // Render Created Covers grid
    userPostsGrid.innerHTML = '';
    if (memberCovers.length === 0) {
      userPostsEmpty.classList.remove('hidden');
    } else {
      userPostsEmpty.classList.add('hidden');
      memberCovers.forEach((book) => {
        userPostsGrid.appendChild(createBookCardElement(book, detailModal.open, 'book-card-btn'));
      });
    }

    // Render Saved Covers grid
    const favIds = loadFavorites();
    const favBooks = favIds.map((id) => findBookById(id)).filter(Boolean);
    tabSavedCountEl.textContent = String(favBooks.length);

    userSavedGrid.innerHTML = '';
    if (favBooks.length === 0) {
      userSavedEmpty.classList.remove('hidden');
    } else {
      userSavedEmpty.classList.add('hidden');
      favBooks.forEach((book) => {
        userSavedGrid.appendChild(createBookCardElement(book, detailModal.open, 'book-card-btn'));
      });
    }
  }

  renderProfileData();

  // Tab switching
  tabCreated.addEventListener('click', () => {
    tabCreated.classList.add('active');
    tabSaved.classList.remove('active');
    panelCreated.classList.remove('hidden');
    panelSaved.classList.add('hidden');
  });

  tabSaved.addEventListener('click', () => {
    tabSaved.classList.add('active');
    tabCreated.classList.remove('active');
    panelSaved.classList.remove('hidden');
    panelCreated.classList.add('hidden');
  });

  // 9. Followers, Following & Community Profiles Exploration Logic
  function getExploreMembers() {
    const allMembers = getAllCommunityMembers();
    const currentSelfId = String(session.userId || session.id || '').toLowerCase();
    const currentSelfEmail = (session.email || '').toLowerCase();

    // STRICT DEDUPLICATION AND NO SELF:
    // Only return community members that are NOT the logged in user
    return allMembers.filter((m) => {
      const mId = String(m.id || '').toLowerCase();
      const mEmail = (m.email || '').toLowerCase();
      if (m.isSelf) return false;
      if (currentSelfId && (mId === currentSelfId || mId === `usr-${currentSelfEmail.replace(/[^a-z0-9]/g, '-')}`)) return false;
      if (currentSelfEmail && mEmail === currentSelfEmail) return false;
      return true;
    });
  }

  function updateModalTabsUI() {
    if (tabModalExplore) tabModalExplore.classList.toggle('active', activeFollowTab === 'explore');
    if (tabModalFollowers) tabModalFollowers.classList.toggle('active', activeFollowTab === 'followers');
    if (tabModalFollowing) tabModalFollowing.classList.toggle('active', activeFollowTab === 'following');
  }

  function openFollowModal(tabName = 'explore') {
    if (!followListModalOverlay) return;
    activeFollowTab = tabName;

    // Sync any registered community members from backend
    syncCommunityMembersFromServer().then(() => {
      renderFollowList();
    }).catch(() => {});

    const displayName = activeUser.name || 'User';
    if (followModalTitle) {
      if (activeFollowTab === 'explore') {
        followModalTitle.textContent = 'Find & Follow Profiles';
      } else if (activeFollowTab === 'followers') {
        followModalTitle.textContent = isSelf ? 'Your Followers' : `${displayName}'s Followers`;
      } else {
        followModalTitle.textContent = isSelf ? 'Profiles You Follow' : `Profiles ${displayName} Follows`;
      }
    }
    if (followModalSub) {
      if (activeFollowTab === 'explore') {
        followModalSub.textContent = 'Discover book cover designers, illustrators, and collectors across the community';
      } else if (activeFollowTab === 'followers') {
        followModalSub.textContent = `Members following ${isSelf ? 'you' : displayName}`;
      } else {
        followModalSub.textContent = `Members followed by ${isSelf ? 'you' : displayName}`;
      }
    }

    updateModalTabsUI();

    if (followSearchInput) followSearchInput.value = '';
    if (followSearchClear) followSearchClear.classList.add('hidden');

    renderFollowList();
    followListModalOverlay.classList.remove('hidden');
    setTimeout(() => followSearchInput?.focus(), 80);
  }

  function closeFollowModal() {
    if (!followListModalOverlay) return;
    followListModalOverlay.classList.add('hidden');
  }

  function renderFollowList() {
    if (!followListContainer) return;

    const allFollowers = getFollowersForUser(activeUser);
    const allFollowing = getFollowingForUser(activeUser);
    const exploreMembers = getExploreMembers();

    if (modalExploreCountEl) modalExploreCountEl.textContent = String(exploreMembers.length);
    if (modalFollowersCountEl) modalFollowersCountEl.textContent = String(allFollowers.length);
    if (modalFollowingCountEl) modalFollowingCountEl.textContent = String(allFollowing.length);

    const query = (followSearchInput?.value || '').trim().toLowerCase();
    let listToRender = [];
    let isSearchMode = false;

    if (query) {
      isSearchMode = true;
      const baseList = activeFollowTab === 'followers'
        ? allFollowers
        : (activeFollowTab === 'following' ? allFollowing : exploreMembers);

      listToRender = baseList.filter((m) => {
        const name = (m.name || '').toLowerCase();
        const handle = (m.handle || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        const bio = (m.bio || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(query) || handle.includes(query) || role.includes(query) || bio.includes(query) || email.includes(query);
      });
    } else {
      if (activeFollowTab === 'explore') {
        listToRender = exploreMembers;
      } else if (activeFollowTab === 'followers') {
        listToRender = allFollowers;
      } else {
        listToRender = allFollowing;
      }
    }

    followListContainer.innerHTML = '';

    if (listToRender.length === 0) {
      const emptyWrap = document.createElement('div');
      emptyWrap.className = 'follow-empty-state';
      if (isSearchMode) {
        emptyWrap.innerHTML = `
          <div class="follow-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div class="follow-empty-title">No matching profiles</div>
          <p class="follow-empty-desc">No profiles found matching "${escapeHtml(query)}". Try searching another name or keyword.</p>
        `;
      } else if (activeFollowTab === 'explore') {
        emptyWrap.innerHTML = `
          <div class="follow-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div class="follow-empty-title">No other profiles yet</div>
          <p class="follow-empty-desc">As new members register or submit covers, their profiles will appear here to explore and follow.</p>
        `;
      } else if (activeFollowTab === 'followers') {
        emptyWrap.innerHTML = `
          <div class="follow-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="follow-empty-title">No followers yet</div>
          <p class="follow-empty-desc">When other members follow this profile, they will appear here.</p>
        `;
      } else {
        emptyWrap.innerHTML = `
          <div class="follow-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div class="follow-empty-title">Not following anyone yet</div>
          <p class="follow-empty-desc">Switch to "Find Profiles" above or use the search bar to discover members to follow.</p>
        `;
      }
      followListContainer.appendChild(emptyWrap);
      return;
    }

    listToRender.forEach((member) => {
      const isSelfMember = (member.isSelf || (session && member.email?.toLowerCase() === session.email?.toLowerCase()) || (session && member.id === session.userId));
      const following = isFollowingUser(member.id || member.email);
      const memberPosts = getMemberPosts(member);

      const card = document.createElement('div');
      card.className = 'follow-user-card';

      card.innerHTML = `
        <a href="profile.html?user=${encodeURIComponent(member.id || member.email)}" class="follow-user-link" title="View ${escapeHtml(member.name)}'s profile">
          <img src="${member.avatar || 'assets/default-avatar.png'}" class="follow-user-avatar" alt="${escapeHtml(member.name)}" onerror="this.src='assets/default-avatar.png'" />
          <div class="follow-user-meta">
            <div class="follow-user-name-line">
              <span class="follow-user-name">${escapeHtml(member.name)}</span>
              ${member.handle ? `<span class="follow-user-handle">${escapeHtml(member.handle)}</span>` : ''}
            </div>
            ${member.role ? `<div class="follow-user-role">${escapeHtml(member.role)}</div>` : ''}
            ${member.bio ? `<div class="follow-user-bio">${escapeHtml(member.bio)}</div>` : ''}
            <div class="follow-user-stats">
              <span>${memberPosts.length} covers posted</span>
              <span class="follow-card-view-btn">View Profile &rarr;</span>
            </div>
          </div>
        </a>
        <div class="follow-user-actions">
          ${
            isSelfMember
              ? `<span class="follow-self-pill">You</span>`
              : `<button type="button" class="follow-toggle-btn ${following ? 'is-following' : ''}" data-follow-member-id="${escapeHtml(member.id || member.email)}" data-follow-member-name="${escapeHtml(member.name)}" title="${following ? 'Unfollow' : 'Follow'} ${escapeHtml(member.name)}">
                  ${
                    following
                      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                           <polyline points="20 6 9 17 4 12"></polyline>
                         </svg>
                         <span>Following</span>`
                      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                           <line x1="12" y1="5" x2="12" y2="19"></line>
                           <line x1="5" y1="12" x2="19" y2="12"></line>
                         </svg>
                         <span>Follow</span>`
                  }
                </button>`
          }
        </div>
      `;

      // Wire inline follow toggle button
      const inlineBtn = card.querySelector('[data-follow-member-id]');
      if (inlineBtn) {
        inlineBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const memberId = inlineBtn.getAttribute('data-follow-member-id');
          const memberName = inlineBtn.getAttribute('data-follow-member-name') || 'User';
          const nowFollowing = toggleFollowUser(memberId);

          if (nowFollowing) {
            showToast(`You are now following ${memberName}!`);
          } else {
            showToast(`Unfollowed ${memberName}.`);
          }

          updateFollowButtonUI();
          renderFollowList();
        });
      }

      followListContainer.appendChild(card);
    });
  }

  // Wire "Find Profiles" button on profile hero
  if (openExploreMembersBtn) {
    openExploreMembersBtn.addEventListener('click', () => openFollowModal('explore'));
  }

  // Wire followers/following buttons on the profile hero
  if (openFollowersBtn) {
    openFollowersBtn.addEventListener('click', () => openFollowModal('followers'));
  }

  if (openFollowingBtn) {
    openFollowingBtn.addEventListener('click', () => openFollowModal('following'));
  }

  if (tabModalExplore) {
    tabModalExplore.addEventListener('click', () => {
      activeFollowTab = 'explore';
      updateModalTabsUI();
      renderFollowList();
    });
  }

  if (tabModalFollowers) {
    tabModalFollowers.addEventListener('click', () => {
      activeFollowTab = 'followers';
      updateModalTabsUI();
      renderFollowList();
    });
  }

  if (tabModalFollowing) {
    tabModalFollowing.addEventListener('click', () => {
      activeFollowTab = 'following';
      updateModalTabsUI();
      renderFollowList();
    });
  }

  if (followModalCloseBtn) {
    followModalCloseBtn.addEventListener('click', closeFollowModal);
  }

  if (followListModalOverlay) {
    followListModalOverlay.addEventListener('click', (e) => {
      if (e.target === followListModalOverlay) closeFollowModal();
    });
  }

  if (followSearchInput) {
    followSearchInput.addEventListener('input', () => {
      if (followSearchClear) {
        if (followSearchInput.value) {
          followSearchClear.classList.remove('hidden');
        } else {
          followSearchClear.classList.add('hidden');
        }
      }
      renderFollowList();
    });
  }

  if (followSearchClear) {
    followSearchClear.addEventListener('click', () => {
      followSearchInput.value = '';
      followSearchClear.classList.add('hidden');
      followSearchInput.focus();
      renderFollowList();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (followListModalOverlay && !followListModalOverlay.classList.contains('hidden')) {
        closeFollowModal();
      }
      if (editModalOverlay && !editModalOverlay.classList.contains('hidden')) {
        closeEditModal();
      }
    }
  });

  // 10. Share profile button
  shareBtn.addEventListener('click', async () => {
    const url = window.location.href;
    const displayName = activeUser.name || 'User';
    const shareData = {
      title: `${displayName}'s Book Cover Profile`,
      text: `Check out the curated book covers posted by ${displayName} on PAGELLE BOOK COVERS!`,
      url
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied to clipboard!');
    } catch {
      showToast('Share: ' + url);
    }
  });

  // Automatically open explore modal if URL has ?explore=1
  if (urlParams.get('explore') === '1' || urlParams.get('search') === '1') {
    openFollowModal('explore');
  }
});
