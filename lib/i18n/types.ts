export type Locale = "en" | "es" | "ca" | "fr" | "de";

export type Dict = {
  dateLocale: string;

  // Language names
  lang_en: string; lang_es: string; lang_ca: string; lang_fr: string; lang_de: string;

  // Nav
  nav_map: string; nav_ascents: string; nav_people: string;
  nav_settings: string; nav_signOut: string; nav_profile: string;
  nav_comingSoon: string; nav_logAscent: string;

  // Common actions
  save: string; cancel: string; delete: string; edit: string;
  saving: string; deleting: string; close: string; next: string;
  skip: string; done: string; optional: string;

  // Map
  map_all: string; map_climbed: string; map_notYet: string;
  map_relief: string; map_loadingMap: string;
  map_viewAscent: string; map_viewAscents: string;
  map_logAscent: string; map_notYetClimbed: string;
  map_climbedBadge: string; map_ascentsBadge: string; map_last: string;
  map_zoomIn: string; map_zoomOut: string; map_unclimbedPeaks: string;

  // Form fields
  field_peak: string; field_selectPeak: string; field_date: string;
  field_route: string; field_routePlaceholder: string;
  field_notes: string; field_notesPlaceholder: string;
  field_photos: string; field_wikiloc: string;
  field_wikilockPlaceholder: string; field_wikilockPreview: string;

  // New ascent
  newAscent_clickOrDrag: string; newAscent_maxSize: string;
  newAscent_savingAscent: string; newAscent_uploadingPhoto: string;
  newAscent_savingTags: string; newAscent_save: string;
  newAscent_saveWithPhotos: string; newAscent_photoFailed: string;
  newAscent_tagged: string;

  // Edit ascent
  edit_failedToSave: string; edit_saveChanges: string;

  // Ascent detail
  detail_with: string; detail_photos: string; detail_addPhotos: string;
  detail_location: string; detail_routeWikiloc: string; detail_openWikiloc: string;

  // Emotional text (ascent detail page)
  emotional_solo: string;  // "You climbed {peak} on {date}."
  emotional_one: string;   // "... with {p1} on {date}."
  emotional_two: string;   // "... with {p1} and {p2} on {date}."
  emotional_many: string;  // "... with {p1}, {p2} and {n} more on {date}."

  // Ascents list
  ascents_newAscent: string; ascents_logTitle: string; ascents_editTitle: string;
  ascents_emptyTitle: string; ascents_emptySub: string;
  ascents_title: string; ascents_search: string; ascents_filters: string;
  ascents_allYears: string; ascents_allPeople: string;
  ascents_withPhoto: string; ascents_clearAll: string;
  ascents_noResults: string; ascents_noResultsSub: string;
  ascents_sort_newest: string; ascents_sort_oldest: string;
  ascents_sort_highest: string; ascents_sort_az: string;
  ascents_delete_title: string; ascents_delete_body: string;
  ascents_stat_ascents: string; ascents_stat_highest: string;
  ascents_stat_peaks: string; ascents_stat_people: string;

  // People
  people_emptyHint: string;
  people_title: string; people_search: string; people_editPerson: string;
  people_fullName: string; people_lastClimb: string; people_noMatch: string;
  people_sort_ascents: string; people_sort_photos: string;
  people_sort_recent: string; people_sort_az: string;
  people_delete_body_photos: string; people_delete_body_simple: string;
  people_stat_people: string; people_stat_photos: string; people_stat_ascents: string;

  // Friends / Social
  friends_title: string; friends_searchPlaceholder: string;
  friends_add: string; friends_requestSent: string; friends_alreadyFriends: string;
  friends_accept: string; friends_reject: string; friends_remove: string; friends_cancel: string;
  friends_pendingSection: string; friends_noPending: string;
  friends_noFriends: string; friends_noFriendsSub: string; friends_noResults: string;
  friends_since: string;
  friends_block: string; friends_blocked: string; friends_unblock: string;
  friends_blockedSection: string;

  // Tags (face tag approval)
  tags_title: string; tags_noPending: string;
  tags_approve: string; tags_reject: string;
  tags_taggedIn: string; tags_pendingCount: string;
  tags_in: string;

  // Profile privacy
  profile_private: string; profile_privateDesc: string;

  // Settings
  settings_title: string; settings_subtitle: string; settings_language: string;
  settings_account: string; settings_username: string;
  settings_name: string; settings_email: string; settings_emailNote: string;
  settings_saveChanges: string; settings_saved: string;
  settings_changePassword: string; settings_changePasswordDesc: string;
  settings_currentPassword: string; settings_newPassword: string;
  settings_confirmPassword: string; settings_passwordChanged: string;
  settings_passwordsDontMatch: string; settings_passwordTooShort: string;
  settings_failedToSave: string;
  settings_privacy: string; settings_profilePublic: string;
  settings_appearInSearch: string; settings_appearInSearchDesc: string;
  settings_profilePublicDesc: string; settings_reviewTags: string;
  settings_reviewTagsDesc: string; settings_allowTagging: string;
  settings_notifications: string; settings_emailNotif: string;
  settings_emailNotifDesc: string; settings_activityNotif: string;
  settings_activityNotifDesc: string; settings_photosTagging: string;
  settings_autoDetect: string; settings_autoDetectDesc: string;
  settings_autoSuggest: string; settings_autoSuggestDesc: string;
  settings_reviewFaces: string; settings_reviewFacesDesc: string;
  settings_dangerZone: string; settings_signOut: string; settings_signOutDesc: string;
  settings_deleteAccount: string; settings_deletePermanent: string;
  settings_deleteWarning: string; settings_deleteConfirmPlaceholder: string;
  settings_deleting: string; settings_deleteConfirmButton: string;
  settings_usernameAvailable: string; settings_usernameTaken: string;
  settings_usernameInvalid: string; settings_usernameChecking: string;
  settings_linkedPerson: string; settings_linkedPersonDesc: string;
  settings_claimPerson: string; settings_unclaimPerson: string;
  settings_searchPerson: string; settings_linkedPersonCurrent: string;

  // Auth
  auth_signInDesc: string; auth_accountCreated: string; auth_invalidCredentials: string;
  auth_signingIn: string; auth_signIn: string; auth_noAccount: string; auth_createOne: string;
  auth_createAccountDesc: string; auth_yourName: string; auth_password: string;
  auth_minPassword: string; auth_registrationFailed: string;
  auth_creatingAccount: string; auth_createAccount: string; auth_haveAccount: string;

  // Crop modal
  crop_title: string; crop_next: string;

  // Tag step
  tag_detecting: string; tag_tagPeople: string; tag_tagPeopleFound: string;
  tag_whoIsThis: string; tag_looksLike: string; tag_confirmCta: string;
  tag_searchOrType: string; tag_createNew: string; tag_removeTag: string;
  tag_noFaces: string; tag_continue: string; tag_continueTagged: string;
  tag_detecting2: string;
  tag_addManual: string; tag_drawHint: string; tag_cancelDraw: string;

  // Photo uploader
  photo_clickOrDrag: string; photo_uploading: string;
  photo_maxSize: string; photo_uploadFailed: string; photo_deleteConfirm: string;

  // Profile
  profile_editProfile: string;
  profile_bio: string;
  profile_bioPlaceholder: string;
  profile_tab_peaks: string;
  profile_stat_photos: string;
  profile_timesClimbed: string;
  profile_noAscents: string;

  // Social feed
  social_subtitle: string;
  social_noFriends: string;
  social_noFriendsSub: string;
  social_addFriends: string;
  social_noActivity: string;
  social_noActivitySub: string;
  social_myActivity: string;

  // Home / Dashboard
  nav_home: string;
  home_greeting: string;
  home_statSummits: string; home_statPhotos: string;
  home_statRegions: string; home_statFriends: string;
  home_ranking: string; home_youAre: string;
  home_motivationBeat: string; home_motivationFirst: string;
  home_motivationNoFriends: string; home_motivationNoFriendsSub: string;
  home_addFriends: string;
  home_recentAscents: string; home_seeAll: string;
  home_friendsActivity: string; home_noFriendActivity: string;
  home_noAscents: string; home_logFirst: string;
  home_badges: string; home_climbed: string;
  home_badgeFirst: string; home_badge10: string;
  home_badge25: string; home_badge50: string;
  home_badgeRegions: string; home_badgePhotos: string;
  home_badgeFriends: string;

  // Level names
  level_novice: string; level_explorer: string; level_hiker: string;
  level_mountaineer: string; level_peakBagger: string; level_summiteer: string;
  // Level progress & gamification
  home_levelNext: string; home_maxLevel: string;
  home_inviteFriends: string; home_motivationDefend: string;
};
