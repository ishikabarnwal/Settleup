package com.ishika.settleupbackend.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class ProductionSettingsTests {

    private static MockEnvironment prod() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        return environment;
    }

    private static MockEnvironment prodWithEverythingSet() {
        MockEnvironment environment = prod();
        ProductionSettings.REQUIRED.forEach(name -> environment.setProperty(name, "set"));
        return environment;
    }

    @Test
    void startsWhenEverythingIsSet() {
        assertThatCode(() -> ProductionSettings.check(prodWithEverythingSet())).doesNotThrowAnyException();
    }

    @Test
    void treatsABlankValueAsMissing() {
        MockEnvironment environment = prodWithEverythingSet();
        environment.setProperty("CORS_ALLOWED_ORIGINS", "  ");

        assertThatThrownBy(() -> ProductionSettings.check(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageEndingWith(": CORS_ALLOWED_ORIGINS");
    }

    @Test
    void namesEveryMissingSettingAtOnce() {
        assertThatThrownBy(() -> ProductionSettings.check(prod()))
                .hasMessageEndingWith(": " + String.join(", ", ProductionSettings.REQUIRED));
    }

    @Test
    void doesNothingOutsideTheProdProfile() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");

        assertThatCode(() -> ProductionSettings.check(environment)).doesNotThrowAnyException();
    }
}
