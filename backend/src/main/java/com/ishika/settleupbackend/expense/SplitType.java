package com.ishika.settleupbackend.expense;

public enum SplitType {

    /** Divide the total evenly, handing the leftover pennies out one at a time. */
    EQUAL("participantIds"),

    /** The caller states every share and they have to add up to the total. */
    EXACT("shares"),

    /** Each person takes a percentage of the total; the percentages add up to 100. */
    PERCENTAGE("percentages");

    private final String inputField;

    SplitType(String inputField) {
        this.inputField = inputField;
    }

    /** The request field that describes who is in a split of this type. */
    public String inputField() {
        return inputField;
    }
}
