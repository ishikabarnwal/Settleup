package com.ishika.settleupbackend;

import com.ishika.settleupbackend.config.ProductionSettings;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SettleUpBackendApplication {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(SettleUpBackendApplication.class);
		app.addListeners(new ProductionSettings());
		app.run(args);
	}

}
