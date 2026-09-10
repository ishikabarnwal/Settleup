package com.ishika.settleupbackend.expense;

public enum SplitType {

    /** Divide the total evenly, handing the leftover pennies out one at a time. */
    EQUAL,

    /** The caller states every share and they have to add up to the total. */
    EXACT
}
