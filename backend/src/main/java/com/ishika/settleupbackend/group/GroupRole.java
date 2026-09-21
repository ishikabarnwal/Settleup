package com.ishika.settleupbackend.group;

public enum GroupRole {

    /** Created the group. Can do everything a member can, plus remove members and delete the group. */
    OWNER,

    /** Can add members, expenses and settlements, and delete expenses and settlements. */
    MEMBER
}
