package com.pufi.scheduler;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:scheduler-test",
		"spring.jpa.hibernate.ddl-auto=create-drop"
})
class SchedulerApplicationTests {

	@Test
	void contextLoads() {
	}

}
