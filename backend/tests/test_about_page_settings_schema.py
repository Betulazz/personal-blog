from app.schemas.portfolio import AboutSettings, SiteSettingsUpdateRequest


def test_legacy_about_settings_receive_story_and_timeline_copy_defaults() -> None:
    settings = AboutSettings.model_validate(
        {
            "interests": [],
            "skills": [],
            "story": ["An existing story paragraph."],
            "timeline": [],
        }
    )

    assert settings.story_heading == "我为什么写这里"
    assert settings.story_introduction == "这不是完成时的简历，而是一份仍在生长中的公开记录。"
    assert settings.skills_heading == "技能"
    assert settings.skills_introduction == "在实践中持续打磨的工具与方法。"
    assert settings.interests_heading == "兴趣"
    assert settings.interests_introduction == "让工作之外的生活也保留一点好奇心。"
    assert settings.timeline_heading == "时间线"
    assert settings.timeline_introduction == "几个让我继续走下去的节点。"
    assert settings.story == ["An existing story paragraph."]


def test_partial_about_update_does_not_materialize_unsubmitted_sections() -> None:
    request = SiteSettingsUpdateRequest.model_validate(
        {"about": {"story_heading": "新的故事标题", "story": ["更新后的段落"]}}
    )

    assert request.model_dump(exclude_unset=True, mode="json") == {
        "about": {"story_heading": "新的故事标题", "story": ["更新后的段落"]}
    }


def test_partial_skills_and_interests_update_does_not_materialize_other_sections() -> None:
    request = SiteSettingsUpdateRequest.model_validate(
        {
            "about": {
                "skills_heading": "常用技能",
                "skills": [{"name": "前端", "items": ["Vue"]}],
                "interests_heading": "最近在意",
                "interests": ["徒步"],
            }
        }
    )

    assert request.model_dump(exclude_unset=True, mode="json") == {
        "about": {
            "skills_heading": "常用技能",
            "skills": [{"name": "前端", "items": ["Vue"]}],
            "interests_heading": "最近在意",
            "interests": ["徒步"],
        }
    }
