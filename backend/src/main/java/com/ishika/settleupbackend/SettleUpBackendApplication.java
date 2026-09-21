package com.ishika.settleupbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SettleUpBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SettleUpBackendApplication.class, args);
	}

}
